import { API_BASE_URL } from '../../constant/constants/api.constants';
import { tratarResposta } from '../../constant/api/http.util';

// Espelha 3-auth/controllers do nest (login/refresh/logout). Sem header
// Authorization aqui de propósito - login/refresh/logout são as únicas 3
// rotas que nunca precisam dele (é justamente o que elas emitem).
//
// CORRIGIDO (07-08-2026): este arquivo tinha um `tratarResposta` próprio,
// que lançava `Error` comum em vez do `ErroHttp` (com `.status`) do
// http.util.js compartilhado - `traduzirErro()` (usado por login-page.jsx,
// feito de propósito pra reconhecer 429 do ThrottlerGuard) precisa de
// `erro instanceof ErroHttp` pra funcionar; com o `Error` comum, todo erro
// de login (incluindo o 429 de "Muitas tentativas") caía sempre na
// mensagem genérica de "não foi possível falar com o servidor".

export async function login(email, senha) {
  const resposta = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, senha }),
  });
  return tratarResposta(resposta);
}

export async function refresh(refreshToken) {
  const resposta = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  return tratarResposta(resposta);
}

export async function logout(refreshToken) {
  const resposta = await fetch(`${API_BASE_URL}/auth/logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  return tratarResposta(resposta);
}

// Cadastro público (09-08-2026, Bloco D) - mesma forma de resposta do
// login (accessToken/refreshToken/usuario/papeis), mais
// tokenVerificacaoEmailDev (só fora de produção).
export async function cadastro(nome, email, senha, aceiteTermos) {
  const resposta = await fetch(`${API_BASE_URL}/auth/cadastro`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nome, email, senha, aceiteTermos }),
  });
  return tratarResposta(resposta);
}

export async function verificarEmail(token) {
  const resposta = await fetch(`${API_BASE_URL}/auth/verificar-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });
  return tratarResposta(resposta);
}
