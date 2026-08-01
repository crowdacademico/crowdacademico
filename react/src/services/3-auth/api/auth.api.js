import { API_BASE_URL } from '../../constant/constants/api.constants';

// Espelha 3-auth/controllers do nest (login/refresh/logout). Sem header
// Authorization aqui de propósito — login/refresh/logout são as únicas 3
// rotas que nunca precisam dele (é justamente o que elas emitem).
async function tratarResposta(resposta) {
  if (!resposta.ok) {
    const corpo = await resposta.json().catch(() => null);
    throw new Error(corpo?.message || `Erro HTTP ${resposta.status}`);
  }
  if (resposta.status === 204) {
    return undefined;
  }
  return resposta.json();
}

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
