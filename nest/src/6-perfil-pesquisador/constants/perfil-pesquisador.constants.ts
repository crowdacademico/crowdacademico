// Colunas de `perfil_pesquisador` liberadas pra leitura (GRANT SELECT,
// 06_grants.sql) - inclui cpf_criptografado/cpf_hash porque o BACKEND
// precisa poder ler os dois (decifrar sob permissão, checar duplicidade);
// o converter é quem decide se cpf vaza pra resposta HTTP ou vira `null`
// (ver PerfilPesquisadorServiceFindOne). Mudou lá (06)? Muda aqui também.
export const PERFIL_PESQUISADOR_COLUNAS_SELECT = [
  'id_usuario',
  'cpf_criptografado',
  'cpf_hash',
  'tipo_vinculo',
  'vinculo_institucional',
  'titulo_academico',
  'status_pesquisador',
  'ativado_em',
  'score_atual',
  'score_atualizado_em',
] as const;
