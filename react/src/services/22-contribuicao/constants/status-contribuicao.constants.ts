import type { StatusContribuicao } from '../../constant/type/enums-do-banco.gerado';

// Os VALORES vêm do banco (ENUM status_contribuicao, via enums-do-banco.gerado.ts). Ciclo: pendente (Pix gerado) ->
// confirmado (pago) -> repassado (foi para o pesquisador) | a_devolver -> devolvido (tudo-ou-nada sem meta).
export const ROTULO_STATUS_CONTRIBUICAO: Record<StatusContribuicao, string> = {
  pendente: 'Aguardando pagamento',
  confirmado: 'Paga',
  repassado: 'Repassada',
  a_devolver: 'A devolver',
  devolvido: 'Devolvida',
  reembolsado: 'Reembolsada',
  reembolso_manual: 'Reembolso manual',
  expirado: 'Vencida',
  erro: 'Erro',
};

const CLASSE_BADGE_STATUS_CONTRIBUICAO: Record<StatusContribuicao, string> = {
  pendente: 'badge-aviso',
  confirmado: 'badge-info',
  repassado: 'badge-sucesso',
  a_devolver: 'badge-aviso',
  devolvido: 'badge-concluido',
  reembolsado: 'badge-concluido',
  reembolso_manual: 'badge-erro',
  expirado: 'badge-neutro',
  erro: 'badge-erro',
};

export function classeBadgeStatusContribuicao(status: StatusContribuicao): string {
  return CLASSE_BADGE_STATUS_CONTRIBUICAO[status];
}
