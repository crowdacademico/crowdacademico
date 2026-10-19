import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { Pool } from 'pg';
import {
  INTERVALO_TAREFA_MINUTOS,
  TAREFA_AUTOMATICA,
  cronACada,
  tarefaLigada,
} from '../../commons/agendamento/tarefa-automatica';
import { PG_POOL } from '../../commons/database/database.constants';
import { decifrarChavePix } from '../../commons/seguranca/chave-pix-cifra.util';
import { NOME_PROVEDOR_NAO_CONFIGURADO } from '../adapters/nao-configurado/gateway-nao-configurado.adapter';
import { GatewayPagamentoErro } from '../ports/erro-gateway-pagamento';
import { ResultadoRepasse } from '../dto/resultado-repasse.dto';
import {
  REPASSE_GATEWAY,
  type RepasseGatewayPort,
  type TipoChavePix,
} from '../ports/repasse-gateway.port';

interface LinhaRepasse {
  id_repasse: number;
  chave_idempotencia: string;
  id_transferencia_api: string | null;
  valor_liquido: string;
  tipo_chave: TipoChavePix;
  chave_criptografada: string;
  descricao: string;
}

interface Falha {
  mensagem: string;
  recuperavel: boolean;
}

const LOTE_MAXIMO_PADRAO = 20;
const TIMEOUT_GATEWAY_MS_PADRAO = 30_000;

class TimeoutGateway extends Error {}

// Worker de repasse (PR-08): transfere ao pesquisador o dinheiro arrecadado. UMA transferência por repasse, e cada repasse
// já é o lote de UMA campanha (criado no fechamento dela, ou um repasse adicional de uma contribuição que chegou
// tarde): nunca uma transferência por contribuição (custo de tarifa). O valor é o líquido (a taxa da plataforma já
// foi descontada; as contribuições do repasse apontam para ele em contribuicao.id_repasse).
//
// Diferente do worker de estorno, NÃO segura transação aberta durante a chamada ao gateway: reservar_proximo_repasse() muda
// o repasse para 'processando' e grava um prazo (lease) numa transação curta; a chamada ao gateway acontece solta; e o
// resultado é gravado em outra transação curta. Se o processo morrer no meio, o lease vence e outro ciclo retoma:
//   - sem id de transferência guardado: pede a transferência de novo com a MESMA chave de idempotência
//     (repasse.chave_idempotencia), que o provedor devolve em vez de duplicar;
//   - com id: só CONSULTA o provedor, nunca pede outra transferência.
// Isto também é a "reconciliação" natural de uma transferência que o provedor demora a concluir.
//
// Resultado da transferência:
//   concluida     => concluir_repasse(): repasse 'concluido' e contribuições 'repassado', tudo atômico;
//   processando   => registrar_transferencia_repasse(): guarda o id e espera o webhook (ou o próximo lease);
//   erro          => falhar_repasse() não recuperável (repasse 'erro': alguém precisa olhar);
//   GatewayPagamentoErro recuperável (rede) => falhar_repasse() com espera crescente, até o limite de tentativas.
// Sem conta de recebimento verificada do pesquisador, o repasse nem é reservado: espera na fila, sem gastar tentativa.
//
// `PG_POOL` direto, nunca DatabaseService.getDb(): job agendado roda fora do pipeline HTTP (mesma explicação dos outros
// crons). A chave Pix só é decifrada no instante de pedir a transferência e nunca vai para log.
@Injectable()
export class PagamentoServiceTransferPending {
  private readonly logger = new Logger(PagamentoServiceTransferPending.name);
  private emExecucao = false;

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    @Inject(REPASSE_GATEWAY) private readonly gateway: RepasseGatewayPort,
    private readonly config: ConfigService,
  ) {}

  // Agendada: só roda com o interruptor ligado (TAREFA_AUTOMATICA.repasse). "Rodar agora" da T5 chama executar() direto.
  @Cron(cronACada(INTERVALO_TAREFA_MINUTOS.repasse))
  async aoAgendar(): Promise<void> {
    if (await tarefaLigada(this.pool, TAREFA_AUTOMATICA.repasse, this.logger)) {
      await this.executar();
    }
  }

  async executar(): Promise<void> {
    if (this.emExecucao) return;
    this.emExecucao = true;
    try {
      // Antes da fila: o dinheiro de cartão que o provedor liberou desde o último ciclo vira um repasse adicional.
      const liberados = await this.pool.query<{ criados: number }>(
        'SELECT public.criar_repasses_liberados() AS criados',
      );
      if ((liberados.rows[0]?.criados ?? 0) > 0) {
        this.logger.log(
          `${liberados.rows[0].criados} repasse(s) criado(s) com dinheiro de cartão liberado.`,
        );
      }
      const limite = this.numero('REPASSE_LOTE_MAXIMO', LOTE_MAXIMO_PADRAO);
      let tratados = 0;
      while (tratados < limite && (await this.processarProximo())) {
        tratados++;
      }
      if (tratados > 0) {
        this.logger.log(`${tratados} repasse(s) tratado(s) neste ciclo.`);
      }
    } catch (erro) {
      this.logger.error(
        `Falha no worker de repasse: ${erro instanceof Error ? erro.message : String(erro)}`,
      );
    } finally {
      this.emExecucao = false;
    }
  }

  // Trata UM repasse. false = nada a fazer neste ciclo (fila vazia ou nenhum provedor configurado); true = tratou um.
  async processarProximo(): Promise<boolean> {
    // Sem provedor, reservar gravaria o nome do provedor "não configurado" no repasse: nem chega a reservar.
    if (this.gateway.provedor === NOME_PROVEDOR_NAO_CONFIGURADO) {
      return false;
    }

    const fila = await this.pool.query<LinhaRepasse>(
      'SELECT * FROM public.reservar_proximo_repasse($1::varchar)',
      [this.gateway.provedor],
    );
    const item = fila.rows[0] as LinhaRepasse | undefined;
    if (!item) return false;

    const resultado = await this.pedirAoProvedor(item);
    if ('falha' in resultado) {
      const decisao = await this.pool.query<{ falhar_repasse: string }>(
        'SELECT public.falhar_repasse($1::int, $2::text, $3::boolean) AS falhar_repasse',
        [
          item.id_repasse,
          resultado.falha.mensagem,
          resultado.falha.recuperavel,
        ],
      );
      this.logger.warn(
        `Repasse ${item.id_repasse}: falhou (${resultado.falha.mensagem}); ${decisao.rows[0]?.falhar_repasse ?? '?'}.`,
      );
      return true;
    }

    const { transferencia } = resultado;
    if (transferencia.status === 'concluido') {
      await this.pool.query(
        'SELECT public.concluir_repasse($1::int, $2::text)',
        [item.id_repasse, transferencia.idTransferencia],
      );
      this.logger.log(
        `Repasse ${item.id_repasse} concluído (${transferencia.valor}).`,
      );
    } else if (transferencia.status === 'processando') {
      await this.pool.query(
        'SELECT public.registrar_transferencia_repasse($1::int, $2::text)',
        [item.id_repasse, transferencia.idTransferencia],
      );
      this.logger.log(
        `Repasse ${item.id_repasse}: transferência ${transferencia.idTransferencia} em processamento no provedor.`,
      );
    } else {
      const motivo = transferencia.motivoFalha ?? 'transferência falhou';
      // O provedor criou a transferência e ela falhou: id guardado para o rastro; refazer exige uma pessoa.
      await this.pool.query(
        'SELECT public.registrar_transferencia_repasse($1::int, $2::text)',
        [item.id_repasse, transferencia.idTransferencia],
      );
      await this.pool.query(
        'SELECT public.falhar_repasse($1::int, $2::text, FALSE)',
        [item.id_repasse, motivo],
      );
      this.logger.warn(`Repasse ${item.id_repasse}: provedor reportou erro.`);
    }
    return true;
  }

  // Pede a transferência (ou só consulta, se já existe uma). NUNCA lança por falha do gateway: vira { falha }.
  private async pedirAoProvedor(
    item: LinhaRepasse,
  ): Promise<{ transferencia: ResultadoRepasse } | { falha: Falha }> {
    const valor = Number(item.valor_liquido);
    if (!item.id_transferencia_api && !(valor > 0)) {
      return {
        falha: {
          mensagem: 'Valor líquido a repassar é zero.',
          recuperavel: false,
        },
      };
    }

    try {
      if (item.id_transferencia_api) {
        return {
          transferencia: await this.comTimeout(
            this.gateway.consultarTransferencia(item.id_transferencia_api),
          ),
        };
      }

      let chave: string;
      try {
        chave = decifrarChavePix(item.chave_criptografada);
      } catch {
        return {
          falha: {
            mensagem: 'Chave Pix de recebimento ilegível.',
            recuperavel: false,
          },
        };
      }
      return {
        transferencia: await this.comTimeout(
          this.gateway.transferir({
            chaveIdempotencia: item.chave_idempotencia,
            valor,
            destino: { tipoChave: item.tipo_chave, chave },
            descricao: item.descricao,
          }),
        ),
      };
    } catch (erro) {
      if (erro instanceof GatewayPagamentoErro) {
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
      this.logger.error(
        `Erro inesperado ao repassar ${item.id_repasse}`,
        erro instanceof Error ? erro.stack : String(erro),
      );
      return {
        falha: { mensagem: 'Erro inesperado ao repassar.', recuperavel: true },
      };
    }
  }

  private comTimeout<T>(promessa: Promise<T>): Promise<T> {
    const ms = this.numero(
      'REPASSE_TIMEOUT_GATEWAY_MS',
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

  private numero(chave: string, padrao: number): number {
    const valor = Number(this.config.get<string>(chave));
    return Number.isFinite(valor) && valor > 0 ? valor : padrao;
  }
}
