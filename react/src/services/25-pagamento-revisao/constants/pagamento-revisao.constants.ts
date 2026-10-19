import { listaCompleta } from '../../constant/util/lista-completa.util';
import type { SituacaoRevisao } from '../type/pagamento-revisao.type';

// Observação obrigatória de toda ação do painel (dto/request/pagamento-revisao.request-observacao.ts: de 3 a 1.000
// caracteres). ⚠️ Espelho manual do Nest: se o DTO mudar, muda aqui junto. O texto é o rastro de uma decisão tomada
// FORA do sistema (devolver no painel do provedor, corrigir uma chave Pix) e fica na auditoria financeira, com quem fez.
export const OBSERVACAO_REVISAO_MINIMO = 3;
export const OBSERVACAO_REVISAO_LIMITE = 1000;

// O que pede atenção primeiro (é a ordem do filtro).
export const ORDEM_SITUACAO_REVISAO = listaCompleta<SituacaoRevisao>()(
  ['em_revisao_manual', 'vale_tentar_de_novo', 'revisao_resolvida', 'processado'] as const,
);

// Sem vírgula no rótulo: o filtro da tabela guarda os valores marcados no endereço, separados por vírgula.
export const ROTULO_SITUACAO_REVISAO: Record<SituacaoRevisao, string> = {
  em_revisao_manual: 'Em revisão manual',
  vale_tentar_de_novo: 'Tentar de novo',
  revisao_resolvida: 'Revisão resolvida',
  processado: 'Processado',
};

// As que ainda pedem algo: a tela abre filtrada nelas.
export const SITUACOES_PENDENTES: readonly SituacaoRevisao[] = ['em_revisao_manual', 'vale_tentar_de_novo'];

// Em revisão manual pede decisão de uma pessoa (aviso); o que só falhou por motivo transitório costuma se resolver
// quando o provedor reenvia o evento (neutro); processado é o caminho normal (sucesso); a revisão resolvida já teve
// a baixa de uma pessoa (concluído).
export const CLASSE_BADGE_SITUACAO_REVISAO: Record<SituacaoRevisao, string> = {
  em_revisao_manual: 'badge-aviso',
  vale_tentar_de_novo: 'badge-neutro',
  revisao_resolvida: 'badge-concluido',
  processado: 'badge-sucesso',
};

// `tipo_evento` guarda o nome do evento COMO O PROVEDOR mandou (nest/src/23-pagamento/adapters/asaas/asaas-webhook.adapter.ts).
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
  PAYMENT_CHARGEBACK_REQUESTED: 'Contestação de cartão aberta',
  PAYMENT_CHARGEBACK_DISPUTE: 'Contestação de cartão em disputa',
  PAYMENT_AWAITING_CHARGEBACK_REVERSAL: 'Contestação de cartão ganha',
};

export function rotuloTipoEvento(tipoEvento: string): string {
  return ROTULO_TIPO_EVENTO[tipoEvento] ?? tipoEvento;
}
