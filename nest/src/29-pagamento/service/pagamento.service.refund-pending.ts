import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { Pool, PoolClient } from 'pg';
import { PG_POOL } from '../../commons/database/database.constants';
import { GatewayPagamentoErro } from '../dto/erro-gateway-pagamento';
import {
  COBRANCA_GATEWAY,
  type CobrancaGatewayPort,
} from '../ports/cobranca-gateway.port';

interface LinhaEstorno {
  id_contribuicao: number;
  id_cobranca: string | null;
  valor_bruto: string;
  valor_liquido: string;
  tentativas: number;
  prazo_vencido: boolean;
}

interface Falha {
  mensagem: string;
  recuperavel: boolean;
}

// Teto de contribuições tratadas por execução e timeout da chamada ao gateway (ambos por variável de ambiente).
const LOTE_MAXIMO_PADRAO = 50;
const TIMEOUT_GATEWAY_MS_PADRAO = 30_000;

class TimeoutGateway extends Error {}

// Worker de estorno (PR-07): devolve o dinheiro das contribuições 'a_devolver', ou seja, o lote automático de uma
// campanha ALL-OR-NOTHING que fechou sem atingir a meta (encerrar_campanhas_vencidas, 05 [05-K-2]). Campanha com
// sucesso repassa ao pesquisador; flexível nunca devolve. Estorno individual (contestação, fraude, moderação) NÃO passa
// por aqui: é outra decisão de negócio.
//
// UM estorno por contribuição, nunca em lote (diferente do repasse), do valor INTEIRO da contribuição: quem apoiou
// pagou valor + tarifa de pagamento e recebe o valor de volta; a tarifa fica com o provedor (proximo_estorno_pendente).
//
// Cada contribuição é uma transação curta, na ordem que o plano de pagamentos pede:
//   BEGIN
//   proximo_estorno_pendente(provedor)   -> FOR UPDATE SKIP LOCKED: duas instâncias nunca pegam a mesma contribuição
//   gateway.estornar(...)                -> com a chave de idempotência da contribuição: repetir não estorna duas vezes
//   concluir_estorno() | registrar_falha_estorno()
//   COMMIT
// O client do pool fica preso durante a chamada ao gateway (ao contrário de POST /contribuicao, que não pode, pois
// teria um client por requisição simultânea). Aqui é no máximo UM por execução do worker, a chamada tem timeout
// próprio e o banco mata a sessão se ela ficar ociosa além do dobro disso (idle_in_transaction_session_timeout),
// soltando o lock sozinho. Sem isso, o lock de linha do SKIP LOCKED não teria como existir.
//
// Falha do gateway: recuperável (rede, saldo insuficiente) => registrar_falha_estorno reagenda com espera crescente;
// só vira 'reembolso_manual' depois de N tentativas, ou se a falha não for recuperável, ou se o prazo do Pix vencer.
// Se o gateway estornou mas o banco falhou em concluir, o ROLLBACK deixa a contribuição na fila e a próxima tentativa,
// com a MESMA chave, recebe o resultado anterior em vez de estornar de novo.
//
// `PG_POOL` direto, nunca DatabaseService.getDb(): job agendado roda fora do pipeline HTTP (mesma explicação de
// CampanhaServiceCloseExpired). Só enxerga contribuições do provedor configurado (provedor = o do gateway injetado),
// o que também impede de queimar tentativas quando não há provedor configurado.
@Injectable()
export class PagamentoServiceRefundPending {
  private readonly logger = new Logger(PagamentoServiceRefundPending.name);
  private emExecucao = false;

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    @Inject(COBRANCA_GATEWAY) private readonly gateway: CobrancaGatewayPort,
    private readonly config: ConfigService,
  ) {}

  // A cada 5 minutos: devolução não tem pressa de segundos, mas também não deve esperar horas.
  @Cron('*/5 * * * *')
  async executar(): Promise<void> {
    // Sem isto, uma execução lenta (gateway devagar) e a seguinte do cron correriam juntas no mesmo processo.
    if (this.emExecucao) return;
    this.emExecucao = true;
    try {
      const limite = this.numero('ESTORNO_LOTE_MAXIMO', LOTE_MAXIMO_PADRAO);
      let tratadas = 0;
      while (tratadas < limite && (await this.processarProximo())) {
        tratadas++;
      }
      if (tratadas > 0) {
        this.logger.log(`${tratadas} estorno(s) tratado(s) neste ciclo.`);
      }
    } catch (erro) {
      // try/catch pelo mesmo motivo dos outros crons: exceção solta vira unhandledRejection e derruba o processo.
      this.logger.error(
        `Falha no worker de estorno: ${erro instanceof Error ? erro.message : String(erro)}`,
      );
    } finally {
      this.emExecucao = false;
    }
  }

  // Trata UMA contribuição. Devolve false quando não há mais nada a fazer neste ciclo (fila vazia, ou o provedor não
  // está configurado), e true quando tratou uma. Erro de banco sobe: o ciclo para, em vez de martelar a mesma linha.
  async processarProximo(): Promise<boolean> {
    const client = await this.pool.connect();
    let destruir = false;
    try {
      await client.query('BEGIN');
      const idleMs =
        this.numero('ESTORNO_TIMEOUT_GATEWAY_MS', TIMEOUT_GATEWAY_MS_PADRAO) *
        2;
      await client.query(
        `SET LOCAL idle_in_transaction_session_timeout = ${Math.trunc(idleMs)}`,
      );

      const fila = await client.query<LinhaEstorno>(
        'SELECT * FROM public.proximo_estorno_pendente($1::varchar)',
        [this.gateway.provedor],
      );
      const item = fila.rows[0] as LinhaEstorno | undefined;
      if (!item) {
        await client.query('ROLLBACK');
        return false;
      }

      const liquido = Number(item.valor_liquido);
      const resultado = await this.tentarEstornar(item, liquido);
      if (resultado === 'nao_configurado') {
        await client.query('ROLLBACK');
        return false;
      }

      // O provedor aceitou o pedido mas ainda não devolveu (ex.: esperando a autorização): continua 'a_devolver' e o próximo
      // ciclo confere de novo (a mesma chave acha a mesma devolução, sem pedir outra). Conta como tentativa: uma devolução
      // que nunca conclui acaba em reembolso manual, para uma pessoa olhar.
      if ('falha' in resultado || !resultado.concluido) {
        const falha: Falha =
          'falha' in resultado
            ? resultado.falha
            : {
                mensagem:
                  'Devolução pedida ao provedor; aguardando ele concluir.',
                recuperavel: true,
              };
        const decisao = await client.query<{ registrar_falha_estorno: string }>(
          'SELECT public.registrar_falha_estorno($1::int, $2::text, $3::boolean, $4::numeric)',
          [item.id_contribuicao, falha.mensagem, falha.recuperavel, liquido],
        );
        await client.query('COMMIT');
        this.logger.warn(
          `Estorno da contribuição ${item.id_contribuicao}: ${falha.mensagem} (${decisao.rows[0]?.registrar_falha_estorno ?? '?'}).`,
        );
        return true;
      }

      await client.query(
        'SELECT public.concluir_estorno($1::int, $2::numeric)',
        [item.id_contribuicao, resultado.valorEstornado],
      );
      await client.query('COMMIT');
      this.logger.log(
        `Contribuição ${item.id_contribuicao} devolvida (${resultado.valorEstornado} de ${item.valor_bruto}).`,
      );
      return true;
    } catch (erro) {
      destruir = !(await this.desfazer(client));
      throw erro;
    } finally {
      client.release(destruir);
    }
  }

  // Chama o gateway e traduz o desfecho. NUNCA lança por falha do gateway: ela vira { falha } para o chamador gravar.
  private async tentarEstornar(
    item: LinhaEstorno,
    liquido: number,
  ): Promise<
    | { valorEstornado: number; concluido: boolean }
    | { falha: Falha }
    | 'nao_configurado'
  > {
    if (item.prazo_vencido) {
      return {
        falha: {
          mensagem: 'Prazo para estornar o Pix no provedor já venceu.',
          recuperavel: false,
        },
      };
    }
    if (!item.id_cobranca) {
      return {
        falha: {
          mensagem: 'Contribuição sem id de cobrança no provedor.',
          recuperavel: false,
        },
      };
    }
    if (!(liquido > 0)) {
      return {
        falha: {
          mensagem: 'Valor a estornar é zero.',
          recuperavel: false,
        },
      };
    }

    try {
      const estorno = await this.comTimeout(
        this.gateway.estornar(item.id_cobranca, liquido, {
          chaveIdempotencia: `estorno-${item.id_contribuicao}`,
        }),
      );
      return {
        valorEstornado: estorno.valorEstornado,
        concluido: estorno.concluido,
      };
    } catch (erro) {
      if (erro instanceof GatewayPagamentoErro) {
        if (erro.codigo === 'NAO_CONFIGURADO') {
          this.logger.error(
            'Estorno pausado: nenhum provedor de pagamento configurado.',
          );
          return 'nao_configurado';
        }
        return {
          falha: {
            mensagem: `${erro.codigo}: ${erro.message}`,
            recuperavel: erro.recuperavel,
          },
        };
      }
      if (erro instanceof TimeoutGateway) {
        return {
          falha: {
            mensagem: 'REDE: o provedor não respondeu a tempo.',
            recuperavel: true,
          },
        };
      }
      // Erro que não é do contrato do gateway: conta como tentativa recuperável, mas fica no log com a pilha.
      this.logger.error(
        `Erro inesperado ao estornar a contribuição ${item.id_contribuicao}`,
        erro instanceof Error ? erro.stack : String(erro),
      );
      return {
        falha: { mensagem: 'Erro inesperado ao estornar.', recuperavel: true },
      };
    }
  }

  private comTimeout<T>(promessa: Promise<T>): Promise<T> {
    const ms = this.numero(
      'ESTORNO_TIMEOUT_GATEWAY_MS',
      TIMEOUT_GATEWAY_MS_PADRAO,
    );
    let relogio: NodeJS.Timeout | undefined;
    const limite = new Promise<never>((_, rejeitar) => {
      relogio = setTimeout(() => rejeitar(new TimeoutGateway()), ms);
    });
    return Promise.race([promessa, limite]).finally(() =>
      clearTimeout(relogio),
    );
  }

  // true se o ROLLBACK funcionou (a conexão pode voltar ao pool); false descarta a conexão.
  private async desfazer(client: PoolClient): Promise<boolean> {
    try {
      await client.query('ROLLBACK');
      return true;
    } catch {
      return false;
    }
  }

  private numero(chave: string, padrao: number): number {
    const valor = Number(this.config.get<string>(chave));
    return Number.isFinite(valor) && valor > 0 ? valor : padrao;
  }
}
