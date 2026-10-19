import { createHash, timingSafeEqual } from 'crypto';
import { type AutorizacaoSaqueDto } from '../../dto/autorizacao-saque.dto';
import {
  type EventoPagamentoDto,
  type TipoEventoPagamento,
} from '../../dto/evento-pagamento.dto';
import {
  type CabecalhosHttp,
  type WebhookVerifierPort,
} from '../../ports/webhook-verifier.port';
import { NOME_PROVEDOR } from './asaas-cobranca.adapter';
import { type ConfiguracaoAsaas } from './asaas.config';
import { type AsaasWebhookCorpo } from './asaas.types';

// Evento do Asaas => evento de domínio. O sistema NUNCA confia só nisto: o service reconsulta o estado real no provedor.
//   PAYMENT_CONFIRMED / PAYMENT_RECEIVED                              => cobranca_confirmada
//   PAYMENT_OVERDUE / PAYMENT_DELETED                                 => cobranca_expirada
//   PAYMENT_REFUNDED / PAYMENT_PARTIALLY_REFUNDED                     => cobranca_estornada (o service distingue total de
//                                                                        parcial pelo estado real, e o parcial não faz nada)
//   TRANSFER_DONE                                                     => repasse_concluido
//   TRANSFER_FAILED / TRANSFER_CANCELLED                              => repasse_falhou
//   PAYMENT_CHARGEBACK_REQUESTED / _DISPUTE / AWAITING_CHARGEBACK_REVERSAL => cobranca_contestada (revisão manual)
//   qualquer outro (PAYMENT_CREATED, TRANSFER_PENDING, ...)           => desconhecido: gravado na caixa e ignorado
const EVENTOS: Record<string, TipoEventoPagamento> = {
  PAYMENT_CONFIRMED: 'cobranca_confirmada',
  PAYMENT_RECEIVED: 'cobranca_confirmada',
  PAYMENT_OVERDUE: 'cobranca_expirada',
  PAYMENT_DELETED: 'cobranca_expirada',
  PAYMENT_REFUNDED: 'cobranca_estornada',
  PAYMENT_PARTIALLY_REFUNDED: 'cobranca_estornada',
  TRANSFER_DONE: 'repasse_concluido',
  TRANSFER_FAILED: 'repasse_falhou',
  TRANSFER_CANCELLED: 'repasse_falhou',
  PAYMENT_CHARGEBACK_REQUESTED: 'cobranca_contestada',
  PAYMENT_CHARGEBACK_DISPUTE: 'cobranca_contestada',
  PAYMENT_AWAITING_CHARGEBACK_REVERSAL: 'cobranca_contestada',
};

// Comparação em tempo constante (não vaza, pelo tempo de resposta, quantos caracteres do token estavam certos). O hash
// iguala o tamanho dos dois lados, que timingSafeEqual exige.
function tokensIguais(recebido: string | undefined, esperado: string): boolean {
  if (!recebido) return false;
  const a = createHash('sha256').update(recebido).digest();
  const b = createHash('sha256').update(esperado).digest();
  return timingSafeEqual(a, b);
}

function primeiro(valor: string | string[] | undefined): string | undefined {
  return Array.isArray(valor) ? valor[0] : valor;
}

// Webhook do Asaas. Autenticidade: o Asaas manda o token que VOCÊ cadastrou no webhook dele no cabeçalho
// `asaas-access-token` (ASAAS_WEBHOOK_TOKEN). Pedido de autorização de saque: o mesmo cabeçalho, com o token da validação
// de saque (ASAAS_SAQUE_TOKEN, ou o do webhook se não houver um separado).
//
// extrairEvento NUNCA lança: corpo ilegível vira evento 'desconhecido' com id derivado do conteúdo. Responder erro ao
// Asaas faria ele reentregar e, depois de falhas seguidas, pausar a fila inteira de avisos; é melhor guardar e ignorar.
export class AsaasWebhookAdapter implements WebhookVerifierPort {
  readonly provedor = NOME_PROVEDOR;

  constructor(private readonly config: ConfiguracaoAsaas) {}

  verificarAutenticidade(cabecalhos: CabecalhosHttp): boolean {
    return tokensIguais(
      primeiro(cabecalhos['asaas-access-token']),
      this.config.webhookToken,
    );
  }

  verificarAutenticidadeSaque(cabecalhos: CabecalhosHttp): boolean {
    return tokensIguais(
      primeiro(cabecalhos['asaas-access-token']),
      this.config.saqueToken,
    );
  }

  extrairEvento(corpo: unknown): EventoPagamentoDto {
    const evento = (
      corpo && typeof corpo === 'object' ? corpo : {}
    ) as AsaasWebhookCorpo;
    const nome =
      typeof evento.event === 'string' ? evento.event : 'DESCONHECIDO';
    const idEventoExterno =
      typeof evento.id === 'string' && evento.id
        ? evento.id
        : `sem-id:${createHash('sha256')
            .update(JSON.stringify(corpo ?? null))
            .digest('hex')}`;

    return {
      provedor: this.provedor,
      idEventoExterno,
      tipoEvento: EVENTOS[nome] ?? 'desconhecido',
      tipoEventoOriginal: nome,
      idCobranca:
        typeof evento.payment?.id === 'string' ? evento.payment.id : undefined,
      idTransferencia:
        typeof evento.transfer?.id === 'string'
          ? evento.transfer.id
          : undefined,
      payload: corpo,
    };
  }

  // Pedido de validação de saque: {"type":"TRANSFER","transfer":{...}} (o objeto é o mesmo devolvido na criação da
  // transferência). Qualquer outro `type` (BILL, PIX_QR_CODE, MOBILE_PHONE_RECHARGE, PIX_REFUND, ...) é 'outro': este
  // sistema só transfere para chave Pix, e o service recusa o resto.
  extrairAutorizacaoSaque(corpo: unknown): AutorizacaoSaqueDto {
    const pedido = (
      corpo && typeof corpo === 'object' ? corpo : {}
    ) as AsaasWebhookCorpo;
    if (pedido.type === 'PIX_REFUND') {
      const r = pedido.pixRefund ?? {};
      const cobranca =
        typeof r.payment === 'string' ? r.payment : r.payment?.id;
      return {
        tipo: 'estorno',
        idCobranca: typeof cobranca === 'string' ? cobranca : undefined,
        valor: typeof r.value === 'number' ? r.value : undefined,
      };
    }
    if (pedido.type !== 'TRANSFER') return { tipo: 'outro' };
    const t = pedido.transfer ?? {};
    return {
      tipo: 'transferencia',
      idTransferencia: typeof t.id === 'string' ? t.id : undefined,
      referenciaExterna:
        typeof t.externalReference === 'string'
          ? t.externalReference
          : undefined,
      valor: typeof t.value === 'number' ? t.value : undefined,
      chavePixDestino:
        t.pixAddressKey ?? t.bankAccount?.pixAddressKey ?? undefined,
    };
  }

  // Corpo da resposta que o Asaas espera: {"status":"APPROVED"} ou {"status":"REFUSED","refuseReason":"..."}. Qualquer
  // outra coisa, ou 3 falhas seguidas, e o Asaas CANCELA a transferência.
  montarRespostaAutorizacaoSaque(aprovado: boolean, motivo?: string): unknown {
    return aprovado
      ? { status: 'APPROVED' }
      : { status: 'REFUSED', refuseReason: motivo ?? 'Recusado' };
  }
}
