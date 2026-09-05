// Mesmo custo usado em 1-usuario (usuario.service.create.ts/.update.ts) -
// aqui é pro segredo do refresh token, não pra senha do usuário. Continua
// fixo (não configurável) - é parâmetro de segurança puro (custo de hash),
// não regra de produto; nenhum admin deveria poder baixar isso sem entender
// a troca de segurança que está fazendo.
export const CUSTO_BCRYPT_REFRESH_TOKEN = 10;

// Validade da sessão (dias) - DEFAULT, usado só quando a chave
// correspondente não existir/estiver inativa em `configuracoes` (ver
// ConfiguracaoValorService, commons/configuracao). Configurável pelo
// Painel Admin desde 04-09-2026 - mesmo raciocínio de `arquivo`: é regra de
// produto (por quanto tempo alguém continua logado sem precisar entrar de
// novo), não parâmetro de segurança como `CUSTO_BCRYPT_REFRESH_TOKEN` acima.
export const REFRESH_TOKEN_DIAS_VALIDADE_PADRAO = 30;
export const CHAVE_CONFIG_REFRESH_TOKEN_DIAS_VALIDADE =
  'refresh_token_dias_validade';

// Refresh token devolvido ao cliente tem o formato "<id_sessao>.<segredo>" -
// o id_sessao serve só pra achar a linha rápido (índice de PK), a validade de
// verdade é sempre o bcrypt.compare do segredo contra refresh_token_hash.
// Nunca confiar no id_sessao sozinho pra revogar/renovar sem essa checagem.
export const REFRESH_TOKEN_SEPARADOR = '.';

// Validade do token de verificação de e-mail (horas) - DEFAULT, mesmo
// tratamento de REFRESH_TOKEN_DIAS_VALIDADE_PADRAO acima. Configurável
// desde 04-09-2026 - decisão anterior (09-08-2026) tratava isto como
// "parâmetro técnico, não regra de negócio configurável", revista agora: é
// exatamente o mesmo tipo de janela de tempo que `bloqueio_login_minutos`
// já é configurável, então não fazia sentido tratar diferente.
export const VERIFICACAO_EMAIL_HORAS_VALIDADE_PADRAO = 24;
export const CHAVE_CONFIG_VERIFICACAO_EMAIL_HORAS_VALIDADE =
  'verificacao_email_horas_validade';
