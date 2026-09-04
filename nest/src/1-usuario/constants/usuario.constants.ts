// Colunas de `usuario` liberadas pra leitura pública do app_nestjs (GRANT
// SELECT, 06_grants.sql) - só que aqui é a lista PÚBLICA, sem senha_hash de
// propósito (ver 3-auth/service/auth.service.login.ts pra onde senha_hash
// É lido, isoladamente, só ali). Mudou lá? Muda aqui também.
export const USUARIO_COLUNAS_SELECT = [
  'id_usuario',
  'nome',
  'email',
  'id_imagem_perfil',
  'criado_em',
  'deletado',
  'deletado_em',
  'deletado_por',
  'email_verificado',
  'tentativas_login_falhas',
  'bloqueado_ate',
  'ultimo_login_em',
  'ultimo_login_ip',
] as const;
