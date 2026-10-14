export const CONTA_RECEBIMENTO_COLUNAS_SELECT = [
  'id_conta_recebimento',
  'id_usuario',
  'tipo_chave',
  'chave_criptografada',
  'titularidade_verificada_em',
  'ativa',
  'criada_em',
] as const;

export const MENSAGEM_CHAVE_NAO_ENCONTRADA =
  'Chave Pix não encontrada no diretório do Banco Central.';
export const MENSAGEM_CHAVE_DE_OUTRA_PESSOA =
  'A chave Pix informada não pertence ao seu CPF.';
export const MENSAGEM_DICT_INDISPONIVEL =
  'Não foi possível consultar a chave Pix agora. Tente novamente em instantes.';
