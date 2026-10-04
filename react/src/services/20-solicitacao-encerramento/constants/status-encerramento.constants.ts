import type { StatusEncerramento } from '../type/solicitacao-encerramento.type';

export const ROTULO_STATUS_ENCERRAMENTO: Record<StatusEncerramento, string> = {
  pendente: 'Pendente',
  aprovado: 'Aprovado',
  rejeitado: 'Rejeitado',
  cancelado: 'Cancelado',
};

// Pendente pede ação (aviso); aprovado encerrou a campanha (erro, como os encerramentos); rejeitado e cancelado
// deixaram a campanha seguir (neutro).
export const CLASSE_BADGE_STATUS_ENCERRAMENTO: Record<StatusEncerramento, string> = {
  pendente: 'badge-aviso',
  aprovado: 'badge-erro',
  rejeitado: 'badge-neutro',
  cancelado: 'badge-neutro',
};

export const ORDEM_STATUS_ENCERRAMENTO: readonly StatusEncerramento[] = ['pendente', 'aprovado', 'rejeitado', 'cancelado'];
