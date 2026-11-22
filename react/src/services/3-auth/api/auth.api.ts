import { API_BASE_URL } from '../../constant/constants/api.constants';
import { tratarResposta } from '../../constant/api/http.util';
import type {
  AuthFetch,
  AuthResponseExclusaoAgendada,
  AuthResponseLogin,
  AuthResponseRegister,
  AuthResponseVerifyEmail,
  AuthResponseForgotPassword,
} from '../type/auth.type';

// Espelha 3-auth/controllers do nest (login/refresh/logout). Sem header Authorization aqui de propósito:
// login/refresh/logout são as únicas 3 rotas que nunca precisam dele (é justamente o que elas emitem).
//
// Usa o `tratarResposta` compartilhado de http.util.ts (que lança `ErroHttp`, com `.status`), não um próprio:
// `traduzirErro()` (usado por login-page.tsx, feito de propósito para reconhecer 429 do ThrottlerGuard) precisa
// de `erro instanceof ErroHttp`; com um `Error` comum, todo erro de login (incluindo o 429 de "Muitas
// tentativas") cairia sempre na mensagem genérica de "não foi possível falar com o servidor".

// `reativar` (22-11-2026): o clique em "Reativar minha conta" no modal de exclusão agendada repete o login com ele.
export async function login(
  email: string,
  senha: string,
  reativar = false,
): Promise<AuthResponseLogin | AuthResponseExclusaoAgendada> {
  const resposta = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reativar ? { email, senha, reativar } : { email, senha }),
  });
  return tratarResposta<AuthResponseLogin | AuthResponseExclusaoAgendada>(resposta);
}

// Login com Google (18-11-2026): o ID token que o botão do Google entregou. Mesma resposta do login por senha.
export async function entrarComGoogle(
  credential: string,
  reativar = false,
): Promise<AuthResponseLogin | AuthResponseExclusaoAgendada> {
  const resposta = await fetch(`${API_BASE_URL}/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reativar ? { credential, reativar } : { credential }),
  });
  return tratarResposta<AuthResponseLogin | AuthResponseExclusaoAgendada>(resposta);
}

// A renovação devolve o mesmo formato do login (AuthResponseLogin do Nest), com `usuario` e `papeis`.
export async function refresh(refreshToken: string): Promise<AuthResponseLogin> {
  const resposta = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  return tratarResposta<AuthResponseLogin>(resposta);
}

export async function logout(refreshToken: string): Promise<void> {
  const resposta = await fetch(`${API_BASE_URL}/auth/logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  return tratarResposta<void>(resposta);
}

// Cadastro público: mesma forma de resposta do login (accessToken/refreshToken/usuario/papeis), mais
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

export async function esqueciSenha(email: string): Promise<AuthResponseForgotPassword> {
  const resposta = await fetch(`${API_BASE_URL}/auth/esqueci-senha`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  return tratarResposta<AuthResponseForgotPassword>(resposta);
}

export async function redefinirSenha(token: string, senha: string): Promise<{ redefinida: boolean }> {
  const resposta = await fetch(`${API_BASE_URL}/auth/redefinir-senha`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, senha }),
  });
  return tratarResposta<{ redefinida: boolean }>(resposta);
}

export async function verificarEmail(token: string): Promise<AuthResponseVerifyEmail> {
  const resposta = await fetch(`${API_BASE_URL}/auth/verificar-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });
  return tratarResposta<AuthResponseVerifyEmail>(resposta);
}

// Bloqueio parcial do e-mail não confirmado (22-11-2026): a própria conta logada pede outro link de confirmação (o aviso
// do topo da página) ou corrige o e-mail ainda não confirmado (Minha Conta). O link novo vai para o endereço atual.
export async function reenviarMinhaVerificacao(authFetch: AuthFetch): Promise<void> {
  const resposta = await authFetch('/auth/reenviar-minha-verificacao', { method: 'POST' });
  return tratarResposta<void>(resposta);
}

export async function alterarMeuEmail(authFetch: AuthFetch, email: string): Promise<void> {
  const resposta = await authFetch('/auth/meu-email', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  return tratarResposta<void>(resposta);
}
