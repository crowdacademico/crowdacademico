import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { Pool } from 'pg';
import { PG_POOL } from '../../commons/database/database.constants';
import { NOME_PROVEDOR_NAO_CONFIGURADO } from '../adapters/nao-configurado/gateway-nao-configurado.adapter';
import { GatewayPagamentoErro } from '../dto/erro-gateway-pagamento';
import { type StatusCobrancaGateway } from '../dto/resultado-cobranca.dto';
import {
  EventoPagamentoService,
  type StatusAplicavelPorEvento,
} from '../evento-pagamento.service';
import {
  COBRANCA_GATEWAY,
  type CobrancaGatewayPort,
} from '../ports/cobranca-gateway.port';

interface LinhaReconciliar {
  id: number;
  id_cobranca: string;
}

export interface ResumoReconciliacao {
  orfas: number;
  canceladas: number;
  consultadas: number;
  aplicadas: number;
  semMudanca: number;
  emRevisao: number;
  falhas: number;
}

const LOTE_PADRAO = 50;
const LIMITE_EVENTOS_LISTADOS = 200;

// O que o estado REAL de uma cobrança significa para uma contribuição ainda PENDENTE (mesmo mapeamento do webhook,
// pagamento.service.webhook.ts). 'estornada' conta como confirmada: pagou e foi estornada; o estorno aplica o resto.
// 'pendente' no gateway = continua esperando: nada a fazer.
function alvoDoEstadoReal(
  status: StatusCobrancaGateway,
): StatusAplicavelPorEvento | null {
  if (status === 'confirmada' || status === 'estornada') return 'confirmado';
  if (status === 'expirada') return 'expirado';
  return null;
}

// Job de reconciliação (PR-11). Webhook é o caminho normal, mas pode se perder (servidor dormindo, fora do ar na hora,
// o provedor desistiu depois de muitas falhas): este job é a rede de segurança. A cada ciclo:
//   1. fecha contribuições ÓRFÃS (pendentes que nunca ganharam cobrança: o vínculo do POST /contribuicao falhou);
//   2. reconsulta no gateway as contribuições 'pendente' que já passaram do tempo de o webhook chegar e aplica o que o
//      gateway disser. Aplica pelo MESMO caminho do webhook: grava um evento sintético em evento_pagamento (id
//      "reconciliacao:<cobrança>:<resultado>", único por cobrança e resultado) e chama aplicar_evento_pagamento(),
//      então valem as mesmas regras (pagamento depois do fechamento da campanha, revisão manual, auditoria com o
//      id do evento) e uma entrega real do webhook depois dá apenas "sem mudança";
//   2b. CANCELA no provedor a cobrança de contribuição que já morreu aqui (expirado/erro): sem isso, um Pix que o provedor
//      ainda deixa pagar (o Asaas só tem vencimento por data e o QR vale por meses) seria dinheiro recebido que o sistema
//      não contabiliza. Cobrança já inexistente ou já paga (que o provedor não deixa cancelar) sai da fila do mesmo jeito:
//      paga é assunto do webhook, que cai em revisão manual;
//   3. loga o estado da caixa de webhooks que não terminou (D5): quantos vale tentar de novo e quantos em revisão manual.
// Repasse 'processando' não precisa de passo aqui: o worker de repasse já retoma ao vencer o lease e CONSULTA o
// provedor (pagamento.service.transfer-pending.ts). pendente -> expirado do Pix é de expirar_contribuicoes_pendentes.
// Quais contribuições entram é decidido pelo banco (reservar_contribuicoes_para_reconciliar: limites em
// configuracoes, reserva para não perguntar a mesma cobrança a cada ciclo).
//
// `PG_POOL` direto, nunca DatabaseService.getDb(): job agendado roda fora do pipeline HTTP (mesma explicação dos outros
// crons); try/catch por item para uma cobrança com problema não parar as outras; log agregado no fim.
@Injectable()
export class PagamentoServiceReconcile {
  private readonly logger = new Logger(PagamentoServiceReconcile.name);
  private emExecucao = false;

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    @Inject(COBRANCA_GATEWAY) private readonly gateway: CobrancaGatewayPort,
    private readonly eventos: EventoPagamentoService,
    private readonly config: ConfigService,
  ) {}

  @Cron('*/10 * * * *')
  async executar(): Promise<void> {
    if (this.emExecucao) return;
    this.emExecucao = true;
    try {
      const resumo = await this.reconciliar();
      if (
        resumo.orfas + resumo.consultadas + resumo.canceladas + resumo.falhas >
          0 ||
        resumo.emRevisao > 0
      ) {
        this.logger.log(
          `Reconciliação: ${resumo.orfas} órfã(s) encerrada(s), ${resumo.canceladas} cobrança(s) cancelada(s) no provedor, ${resumo.consultadas} cobrança(s) reconsultada(s) ` +
            `(${resumo.aplicadas} aplicada(s), ${resumo.semMudanca} sem mudança, ${resumo.emRevisao} em revisão, ${resumo.falhas} falha(s)).`,
        );
      }
    } catch (erro) {
      this.logger.error(
        `Falha na reconciliação: ${erro instanceof Error ? erro.message : String(erro)}`,
      );
    } finally {
      this.emExecucao = false;
    }
  }

  async reconciliar(): Promise<ResumoReconciliacao> {
    const resumo: ResumoReconciliacao = {
      orfas: 0,
      canceladas: 0,
      consultadas: 0,
      aplicadas: 0,
      semMudanca: 0,
      emRevisao: 0,
      falhas: 0,
    };

    resumo.orfas = await this.encerrarOrfas();

    // Sem provedor configurado não há o que perguntar (e nenhuma contribuição pertence a ele).
    if (this.gateway.provedor !== NOME_PROVEDOR_NAO_CONFIGURADO) {
      const lote = this.numero('RECONCILIACAO_LOTE', LOTE_PADRAO);
      const fila = await this.pool.query<LinhaReconciliar>(
        'SELECT * FROM public.reservar_contribuicoes_para_reconciliar($1::varchar, $2::int)',
        [this.gateway.provedor, lote],
      );
      for (const item of fila.rows) {
        try {
          await this.reconciliarUma(item, resumo);
        } catch (erro) {
          resumo.falhas++;
          this.logger.warn(
            `Reconciliação da contribuição ${item.id} falhou: ${
              erro instanceof GatewayPagamentoErro
                ? erro.codigo
                : erro instanceof Error
                  ? erro.message
                  : String(erro)
            }`,
          );
        }
      }
    }

    if (this.gateway.provedor !== NOME_PROVEDOR_NAO_CONFIGURADO) {
      resumo.canceladas = await this.cancelarCobrancasEncerradas();
    }

    await this.registrarEstadoDaCaixa(resumo);
    return resumo;
  }

  private async cancelarCobrancasEncerradas(): Promise<number> {
    const lote = this.numero('RECONCILIACAO_LOTE', LOTE_PADRAO);
    const fila = await this.pool.query<LinhaReconciliar>(
      'SELECT * FROM public.reservar_cobrancas_para_cancelar($1::varchar, $2::int)',
      [this.gateway.provedor, lote],
    );
    let canceladas = 0;
    for (const item of fila.rows) {
      try {
        await this.gateway.cancelarCobranca(item.id_cobranca);
      } catch (erro) {
        // Definitivo (inexistente, já paga, recusada): não há mais o que cancelar. Transitório (rede, credencial): fica
        // reservada e volta à fila depois do intervalo configurado.
        const definitivo =
          erro instanceof GatewayPagamentoErro && !erro.recuperavel;
        if (!definitivo) {
          this.logger.warn(
            `Cancelamento da cobrança da contribuição ${item.id} adiado: ${
              erro instanceof GatewayPagamentoErro
                ? erro.codigo
                : 'erro inesperado'
            }.`,
          );
          continue;
        }
      }
      try {
        await this.pool.query(
          'SELECT public.marcar_cobranca_cancelada($1::int)',
          [item.id],
        );
        canceladas++;
      } catch (erro) {
        this.logger.warn(
          `Não foi possível marcar a cobrança da contribuição ${item.id} como cancelada: ${
            erro instanceof Error ? erro.message : String(erro)
          }`,
        );
      }
    }
    return canceladas;
  }

  private async encerrarOrfas(): Promise<number> {
    const orfas = await this.pool.query<{ id: number }>(
      'SELECT id FROM public.encerrar_contribuicoes_orfas()',
    );
    if (orfas.rows.length > 0) {
      // Pode existir cobrança solta no gateway: vence sozinha, e o suporte a acha pelos ids abaixo.
      this.logger.warn(
        `Contribuição(ões) órfã(s) encerrada(s) com erro (sem cobrança vinculada): ${orfas.rows
          .map((linha) => linha.id)
          .join(', ')}.`,
      );
    }
    return orfas.rows.length;
  }

  private async reconciliarUma(
    item: LinhaReconciliar,
    resumo: ResumoReconciliacao,
  ): Promise<void> {
    const real = await this.gateway.consultarCobranca(item.id_cobranca);
    resumo.consultadas++;
    const alvo = alvoDoEstadoReal(real.status);
    if (!alvo) return;

    const registro = await this.eventos.registrar({
      provedor: this.gateway.provedor,
      idEventoExterno: `reconciliacao:${item.id_cobranca}:${alvo}`,
      tipoEvento:
        alvo === 'confirmado' ? 'cobranca_confirmada' : 'cobranca_expirada',
      tipoEventoOriginal: 'RECONCILIACAO',
      idCobranca: item.id_cobranca,
      payload: { origem: 'reconciliacao', statusReal: real.status },
    });
    if (registro.processado || registro.emRevisao) {
      resumo.semMudanca++;
      return;
    }

    const resultado = await this.eventos.aplicar(
      registro.idEvento,
      this.gateway.provedor,
      item.id_cobranca,
      alvo,
    );
    if (resultado === 'revisao_manual') {
      resumo.emRevisao++;
      this.logger.error(
        `Reconciliação da contribuição ${item.id}: gateway diz "${real.status}" mas o sistema não aplicou; em revisão manual (evento ${registro.idEvento}).`,
      );
    } else if (resultado === 'aplicado') {
      resumo.aplicadas++;
    } else {
      resumo.semMudanca++;
    }
  }

  // D5: a caixa de webhooks que não terminou, separada em "vale tentar de novo" e "em revisão manual". Só leitura e log:
  // o reprocessamento automático dos "vale tentar de novo" fica para depois (o gateway reentrega por 14 dias).
  private async registrarEstadoDaCaixa(
    resumo: ResumoReconciliacao,
  ): Promise<void> {
    const pendentes = await this.eventos.listarNaoProcessados(
      LIMITE_EVENTOS_LISTADOS,
    );
    const revisao = pendentes.filter(
      (evento) => evento.situacao === 'em_revisao_manual',
    ).length;
    resumo.emRevisao = Math.max(resumo.emRevisao, revisao);
    if (pendentes.length > 0) {
      this.logger.warn(
        `Caixa de webhooks: ${pendentes.length - revisao} para tentar de novo, ${revisao} em revisão manual.`,
      );
    }
  }

  private numero(chave: string, padrao: number): number {
    const valor = Number(this.config.get<string>(chave));
    return Number.isFinite(valor) && valor > 0 ? valor : padrao;
  }
}
