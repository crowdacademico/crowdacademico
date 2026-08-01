// Mesmo custo usado em 1-usuario (usuario.service.create.ts/.update.ts) —
// aqui é pro segredo do refresh token, não pra senha do usuário.
export const CUSTO_BCRYPT_REFRESH_TOKEN = 10;

export const REFRESH_TOKEN_DIAS_VALIDADE = 30;

// Refresh token devolvido ao cliente tem o formato "<id_sessao>.<segredo>" —
// o id_sessao serve só pra achar a linha rápido (índice de PK), a validade de
// verdade é sempre o bcrypt.compare do segredo contra refresh_token_hash.
// Nunca confiar no id_sessao sozinho pra revogar/renovar sem essa checagem.
export const REFRESH_TOKEN_SEPARADOR = '.';
