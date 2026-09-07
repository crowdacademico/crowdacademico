import { API_BASE_URL } from '../../constant/constants/api.constants';
import { tratarResposta } from '../../constant/api/http.util';
import type {
  AuthResponseLogin,
  AuthResponseRefresh,
  AuthResponseRegister,
  AuthResponseVerificarEmail,
} from '../type/auth.type';

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

export async function login(email: string, senha: string): Promise<AuthResponseLogin> {
  const resposta = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, senha }),
  });
  return tratarResposta<AuthResponseLogin>(resposta);
}

export async function refresh(refreshToken: string): Promise<AuthResponseRefresh> {
  const resposta = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  return tratarResposta<AuthResponseRefresh>(resposta);
}

export async function logout(refreshToken: string): Promise<void> {
  const resposta = await fetch(`${API_BASE_URL}/auth/logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  return tratarResposta<void>(resposta);
}

// Cadastro público (09-08-2026, Bloco D) - mesma forma de resposta do
// login (accessToken/refreshToken/usuario/papeis), mais
// tokenVerificacaoEmailDev (só fora de produção).
export async function cadastro(
  nome: string,
  email: string,
  senha: string,
  aceiteTermos: boolean,
): Promise<AuthResponseRegister> {
  const resposta = await fetch(`${API_BASE_URL}/auth/cadastro`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nome, email, senha, aceiteTermos }),
  });
  return tratarResposta<AuthResponseRegister>(resposta);
}

export async function verificarEmail(token: string): Promise<AuthResponseVerificarEmail> {
  const resposta = await fetch(`${API_BASE_URL}/auth/verificar-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });
  return tratarResposta<AuthResponseVerificarEmail>(resposta);
}
