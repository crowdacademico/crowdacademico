// Espelha o ENUM status_campanha (01_extensoes_enums_tabelas.sql) -
// rótulo legível + classe de badge, compartilhado entre a listagem e a
// consulta (services/12-campanha/*). Mesma ordem de "poder"/ciclo de
// vida do enum, não alfabética - ajuda o filtro facetado de GenericTable
// (`ordem`) a mostrar as opções numa sequência que faz sentido de
// fluxo, não embaralhada.
export type StatusCampanha =
  | 'aguardando_aprovacao'
  | 'ativo'
  | 'sucesso'
  | 'nao_atingido'
  | 'rejeitado'
  | 'encerrado'
  | 'encerrado_moderacao';

export const ORDEM_STATUS_CAMPANHA: StatusCampanha[] = [
  'aguardando_aprovacao',
  'ativo',
  'sucesso',
  'nao_atingido',
  'rejeitado',
  'encerrado',
  'encerrado_moderacao',
];

export const ROTULO_STATUS_CAMPANHA: Record<StatusCampanha, string> = {
  aguardando_aprovacao: 'Aguardando aprovação',
  ativo: 'Ativo',
  sucesso: 'Sucesso',
  nao_atingido: 'Não atingido',
  rejeitado: 'Rejeitado',
  encerrado: 'Encerrado',
  encerrado_moderacao: 'Encerrado (moderação)',
};

const CLASSE_BADGE_STATUS_CAMPANHA: Record<StatusCampanha, string> = {
  aguardando_aprovacao: 'badge-neutro',
  ativo: 'badge-sucesso',
  sucesso: 'badge-sucesso',
  nao_atingido: 'badge-neutro',
  rejeitado: 'badge-erro',
  encerrado: 'badge-neutro',
  encerrado_moderacao: 'badge-erro',
};

export function classeBadgeStatusCampanha(status: StatusCampanha): string {
  return CLASSE_BADGE_STATUS_CAMPANHA[status];
}
