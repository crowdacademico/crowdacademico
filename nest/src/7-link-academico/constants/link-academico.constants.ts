// link_academico não tem GRANT SELECT de coluna própria (06_grants.sql,
// [06-F]) - cai no `GRANT SELECT ON ALL TABLES` genérico (linha ~56), nunca
// revogado pra esta tabela (diferente de usuario/perfil_pesquisador, ver
// [06-D-1]). Nenhuma coluna sensível aqui, então a lista abaixo é só
// documentação de quais colunas o service usa, não uma restrição de
// segurança de verdade.
export const LINK_ACADEMICO_COLUNAS_SELECT = [
  'id_link_academico',
  'id_usuario',
  'id_tipolink',
  'ordem',
  'url',
  'rotulo',
] as const;
