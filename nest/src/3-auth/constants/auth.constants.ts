// Mesmo custo de CUSTO_BCRYPT_SENHA (1-usuario/constants/usuario.constants.ts) -
// aqui é pro segredo do refresh token, não pra senha do usuário. Continua
// fixo (não configurável) - é parâmetro de segurança puro (custo de hash),
// não regra de produto; nenhum admin deveria poder baixar isso sem entender
// a troca de segurança que está fazendo.
export const CUSTO_BCRYPT_REFRESH_TOKEN = 10;

// Login recusado por e-mail sem conta, conta excluída ou senha errada: a mesma resposta nos três casos, para não
// revelar quais e-mails têm conta (OWASP). A frase vai no topo e os DOIS campos ficam marcados, cada um com o seu
// texto embaixo (formato `campos`, o mesmo da validação); a tela mantém o e-mail e limpa a senha.
export const MENSAGEM_LOGIN_RECUSADO =
  "E-mail ou senha inválidos. Tente novamente ou clique em 'Esqueceu a senha?'.";
// Login com Google (18-11-2026). Token que não confere (assinatura, validade, audience): mensagem genérica.
export const MENSAGEM_GOOGLE_TOKEN_INVALIDO =
  'Não foi possível confirmar o login com o Google. Tente de novo.';
// O Google não confirmou o e-mail da conta: entrar por ele poderia abrir a conta de outra pessoa.
export const MENSAGEM_GOOGLE_EMAIL_NAO_VERIFICADO =
  'O Google não confirmou o e-mail desta conta. Confirme o e-mail no Google ou entre com e-mail e senha.';
// E-mail de uma conta excluída: a conta não volta, e o e-mail não serve para uma conta nova.
export const MENSAGEM_GOOGLE_SEM_CONTA =
  'Não foi possível entrar com esta conta do Google.';
export const CAMPOS_LOGIN_RECUSADO = {
  email: ['E-mail inválido.'],
  senha: ['Senha inválida.'],
};

// Validade da sessão (dias): DEFAULT, usado só quando a chave correspondente não existir/estiver inativa em
// `configuracoes` (ver ConfiguracaoValorService, commons/configuracao). Configurável pelo Painel Admin, mesmo
// raciocínio de `arquivo`: é regra de produto (por quanto tempo alguém continua logado sem precisar entrar de
// novo), não parâmetro de segurança como `CUSTO_BCRYPT_REFRESH_TOKEN` acima.
export const REFRESH_TOKEN_DIAS_VALIDADE_PADRAO = 30;
export const CHAVE_CONFIG_REFRESH_TOKEN_DIAS_VALIDADE =
  'refresh_token_dias_validade';

// Sessão das contas do painel (18-11-2026): uma conta com papel de gestão aberta num computador esquecido é o risco maior
// do sistema. Para elas, a sessão vale no máximo estas horas sem uso (cada renovação conta de novo), mesmo com "Manter
// conectado". 0 = vale o prazo comum. Configurável no painel; o padrão de 12 horas fica perto do console da AWS, que
// encerra a sessão de quem administra depois de 12 horas.
export const SESSAO_PAINEL_HORAS_VALIDADE_PADRAO = 12;
export const CHAVE_CONFIG_SESSAO_PAINEL_HORAS_VALIDADE =
  'sessao_painel_horas_validade';
// Papéis que NÃO dão acesso ao painel (a mesma regra de podeAcessarPainelAdmin, no React): qualquer outro papel conta
// como conta do painel.
export const PAPEIS_SEM_PAINEL: readonly string[] = ['usuario', 'pesquisador'];

// Refresh token devolvido ao cliente tem o formato "<id_sessao>.<segredo>" -
// o id_sessao serve só pra achar a linha rápido (índice de PK), a validade de
// verdade é sempre o bcrypt.compare do segredo contra refresh_token_hash.
// Nunca confiar no id_sessao sozinho pra revogar/renovar sem essa checagem.
export const REFRESH_TOKEN_SEPARADOR = '.';

// Validade do token de verificação de e-mail (horas): DEFAULT, mesmo tratamento de
// REFRESH_TOKEN_DIAS_VALIDADE_PADRAO acima. Configurável: é exatamente o mesmo tipo de janela de tempo que
// `bloqueio_login_minutos`, que já é configurável.
export const VERIFICACAO_EMAIL_HORAS_VALIDADE_PADRAO = 24;
export const CHAVE_CONFIG_VERIFICACAO_EMAIL_HORAS_VALIDADE =
  'verificacao_email_horas_validade';

// Validade do link de "Esqueci minha senha" (minutos): DEFAULT, mesmo tratamento de
// VERIFICACAO_EMAIL_HORAS_VALIDADE_PADRAO acima. Curta de propósito: o link troca a senha da conta.
export const RECUPERACAO_SENHA_MINUTOS_VALIDADE_PADRAO = 30;
export const CHAVE_CONFIG_RECUPERACAO_SENHA_MINUTOS_VALIDADE =
  'recuperacao_senha_minutos_validade';
