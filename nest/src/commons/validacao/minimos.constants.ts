// Tamanhos mínimos de texto que valem em mais de um formulário. Fixos de propósito (não são regra de negócio do
// painel): só evitam um nome de uma letra ou um motivo vazio. Espelho no React: services/constant/constants.
export const NOME_MINIMO_CARACTERES = 2;
export const MENSAGEM_NOME_CURTO = `Nome precisa ter pelo menos ${NOME_MINIMO_CARACTERES} caracteres.`;
export const MOTIVO_SUSPENSAO_MINIMO_CARACTERES = 3;
export const MENSAGEM_MOTIVO_SUSPENSAO_CURTO = `Motivo precisa ter pelo menos ${MOTIVO_SUSPENSAO_MINIMO_CARACTERES} caracteres.`;
