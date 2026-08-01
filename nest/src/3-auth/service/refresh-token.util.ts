import { REFRESH_TOKEN_SEPARADOR } from '../constants/auth.constants';

// Só o parsing de string (sem tocar banco) — por isso não é um service
// Nest, é função pura. AuthServiceRefresh e AuthServiceLogout repetem o
// lookup+bcrypt.compare cada um do seu jeito (poucas linhas, contextos
// diferentes: um rotaciona, o outro só revoga).
export function parseRefreshToken(
  token: string,
): { idSessao: number; segredo: string } | null {
  const indice = token.indexOf(REFRESH_TOKEN_SEPARADOR);
  if (indice <= 0) {
    return null;
  }
  const idSessao = Number(token.slice(0, indice));
  const segredo = token.slice(indice + 1);
  if (!Number.isInteger(idSessao) || !segredo) {
    return null;
  }
  return { idSessao, segredo };
}
