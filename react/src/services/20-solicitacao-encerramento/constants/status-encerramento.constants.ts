import type { StatusEncerramento } from '../type/solicitacao-encerramento.type';

export const ROTULO_STATUS_ENCERRAMENTO: Record<StatusEncerramento, string> = {
  pendente: 'Pendente',
  aprovado: 'Aprovado',
  rejeitado: 'Rejeitado',
  cancelado: 'Cancelado',
};

// Pendente pede ação (aviso); aprovado e rejeitado seguem a resposta ao pedido (sim verde, não vermelho); cancelado
// foi retirado por quem pediu (neutro).
export const CLASSE_BADGE_STATUS_ENCERRAMENTO: Record<StatusEncerramento, string> = {
  pendente: 'badge-aviso',
  aprovado: 'badge-sucesso',
  rejeitado: 'badge-erro',
  cancelado: 'badge-neutro',
};

export const ORDEM_STATUS_ENCERRAMENTO: readonly StatusEncerramento[] = ['pendente', 'aprovado', 'rejeitado', 'cancelado'];
