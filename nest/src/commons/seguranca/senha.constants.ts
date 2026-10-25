// Tamanho mínimo da senha, em todo lugar que cria ou troca senha (cadastro, admin cria usuário, alterar, redefinir).
// Fixo de propósito, não parâmetro do painel: é regra de segurança (NIST SP 800-63B pede pelo menos 8), como o custo do
// bcrypt. O login não confere o tamanho (auth.request-login.ts). Espelho no React: services/3-auth/constants.
export const SENHA_MINIMO_CARACTERES = 8;
export const MENSAGEM_SENHA_CURTA = `A senha precisa ter pelo menos ${SENHA_MINIMO_CARACTERES} caracteres.`;
