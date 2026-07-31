// Colunas de `usuario` liberadas pra leitura do app_nestjs (GRANT SELECT, 06_grants.sql).
// Mudou lá? Muda aqui também — nenhuma outra coluna existe pro backend hoje.
export const USUARIO_COLUNAS_SELECT = `
  id_usuario, nome, email, id_imagem_perfil, criado_em, deletado,
  deletado_em, deletado_por, email_verificado, tentativas_login_falhas,
  bloqueado_ate, ultimo_login_em, ultimo_login_ip
`;
