import { listaCompleta } from '../../constant/util/lista-completa.util';
import type { SituacaoRevisao } from '../type/pagamento-revisao.type';

// Observação obrigatória de toda ação do painel (dto/request/pagamento-revisao.request-observacao.ts: de 3 a 1.000
// caracteres). ⚠️ Espelho manual do Nest: se o DTO mudar, muda aqui junto. O texto é o rastro de uma decisão tomada
// FORA do sistema (devolver no painel do provedor, corrigir uma chave Pix) e fica na auditoria financeira, com quem fez.
export const OBSERVACAO_REVISAO_MINIMO = 3;
export const OBSERVACAO_REVISAO_LIMITE = 1000;

export const ORDEM_SITUACAO_REVISAO = listaCompleta<SituacaoRevisao>()(['em_revisao_manual', 'vale_tentar_de_novo'] as const);

export const ROTULO_SITUACAO_REVISAO: Record<SituacaoRevisao, string> = {
  em_revisao_manual: 'Em revisão manual',
  vale_tentar_de_novo: 'Falhou, vale tentar de novo',
};

// Em revisão manual pede decisão de uma pessoa (aviso); o que só falhou por motivo transitório costuma se resolver
// quando o provedor reenvia o evento (neutro).
export const CLASSE_BADGE_SITUACAO_REVISAO: Record<SituacaoRevisao, string> = {
  em_revisao_manual: 'badge-aviso',
  vale_tentar_de_novo: 'badge-neutro',
};

// `tipo_evento` guarda o nome do evento COMO O PROVEDOR mandou (nest/src/29-pagamento/adapters/asaas/asaas-webhook.adapter.ts).
// Aqui só a tradução para quem opera; nome fora do dicionário aparece como veio (nunca quebra, só fica menos bonito).
const ROTULO_TIPO_EVENTO: Partial<Record<string, string>> = {
  PAYMENT_CONFIRMED: 'Pagamento confirmado',
  PAYMENT_RECEIVED: 'Pagamento recebido',
  PAYMENT_OVERDUE: 'Cobrança vencida',
  PAYMENT_DELETED: 'Cobrança removida',
  PAYMENT_REFUNDED: 'Pagamento estornado',
  PAYMENT_PARTIALLY_REFUNDED: 'Pagamento estornado em parte',
  TRANSFER_DONE: 'Repasse concluído',
  TRANSFER_FAILED: 'Repasse falhou',
  TRANSFER_CANCELLED: 'Repasse cancelado',
};

export function rotuloTipoEvento(tipoEvento: string): string {
  return ROTULO_TIPO_EVENTO[tipoEvento] ?? tipoEvento;
}
