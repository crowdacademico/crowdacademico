import { tratarResposta } from '../../constant/api/http.util';
import type { AuthFetch, AuthResponseSessions, SessaoResponseEndAll } from '../type/auth.type';

// Sessões Ativas (Minha Conta > Segurança). Espelha nest/src/3-auth/controllers/auth.controller.findall-sessions.ts.
export const sessaoApi = {
  listar: (authFetch: AuthFetch): Promise<AuthResponseSessions[]> =>
    authFetch('/auth/sessoes').then(tratarResposta<AuthResponseSessions[]>),
  encerrarUma: (authFetch: AuthFetch, idSessao: number | string): Promise<void> =>
    authFetch(`/auth/sessoes/${idSessao}`, { method: 'DELETE' }).then(tratarResposta<void>),
  encerrarTodasMenosAtual: (authFetch: AuthFetch): Promise<SessaoResponseEndAll> =>
    authFetch('/auth/sessoes', { method: 'DELETE' }).then(
      tratarResposta<SessaoResponseEndAll>,
    ),
};
