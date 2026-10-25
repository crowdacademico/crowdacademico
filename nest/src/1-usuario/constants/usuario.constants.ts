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

// Custo do bcrypt da SENHA do usuário (create e update). Parâmetro de segurança puro, fixo de propósito
// (não é regra de produto); o do refresh token é outra constante (auth.constants.ts), mesmo valor.
export const CUSTO_BCRYPT_SENHA = 10;

// Quem pode ver a lista de usuários, a ficha e o histórico de login de outra pessoa: o admin
// (usuario_visualizar_sensivel) ou o atendimento (usuario_visualizar_atendimento, papel Suporte). A de atendimento
// não abre mais nada: a fila de e-mails (com os links de verificação e de nova senha) e os aceites de termo
// continuam só com a sensível (04, pol_notificacao_select e pol_usuario_termo_select).
export const PERMISSOES_VER_USUARIOS = [
  'usuario_visualizar_sensivel',
  'usuario_visualizar_atendimento',
] as const;
