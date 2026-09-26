// Espelha o ENUM status_campanha (01_extensoes_enums_tabelas.sql) -
// rótulo legível + classe de badge, compartilhado entre a listagem e a
// consulta (services/12-campanha/*). Mesma ordem de "poder"/ciclo de
// vida do enum, não alfabética - ajuda o filtro facetado de GenericTable
// (`ordem`) a mostrar as opções numa sequência que faz sentido de
// fluxo, não embaralhada.
export type StatusCampanha =
  | 'rascunho'
  | 'aguardando_aprovacao'
  | 'ativo'
  | 'sucesso'
  | 'nao_atingido'
  | 'rejeitado'
  | 'encerrado'
  | 'encerrado_moderacao';

export const ORDEM_STATUS_CAMPANHA: StatusCampanha[] = [
  'rascunho',
  'aguardando_aprovacao',
  'ativo',
  'sucesso',
  'nao_atingido',
  'rejeitado',
  'encerrado',
  'encerrado_moderacao',
];

export const ROTULO_STATUS_CAMPANHA: Record<StatusCampanha, string> = {
  rascunho: 'Rascunho',
  aguardando_aprovacao: 'Aguardando aprovação',
  ativo: 'Ativo',
  sucesso: 'Sucesso',
  nao_atingido: 'Não atingido',
  rejeitado: 'Rejeitado',
  encerrado: 'Encerrado',
  encerrado_moderacao: 'Encerrado (moderação)',
};

// `aguardando_aprovacao` usa 'badge-aviso': o estado que EXIGE ação do administrador não pode ter a mesma cor
// cinza de `nao_atingido`/`encerrado`, que são estados mortos. A fila de aprovação tem sinal visual próprio, e
// o cinza fica para o `rascunho`, que é o estado que de fato ainda não é nada.
const CLASSE_BADGE_STATUS_CAMPANHA: Record<StatusCampanha, string> = {
  rascunho: 'badge-neutro',
  aguardando_aprovacao: 'badge-aviso',
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
