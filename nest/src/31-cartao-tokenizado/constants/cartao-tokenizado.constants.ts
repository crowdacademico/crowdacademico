// Sem token_cartao de propósito: o token não sai em resposta de API (ver CartaoTokenizadoResponse).
export const CARTAO_TOKENIZADO_COLUNAS_SELECT = [
  'id_cartao',
  'id_usuario',
  'provedor',
  'bandeira',
  'ultimos_digitos',
  'ativo',
  'criado_em',
] as const;
