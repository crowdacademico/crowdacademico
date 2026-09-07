import { tratarResposta } from '../../constant/api/http.util';
import type { AuthFetch, SessaoResponse, SessaoResponseEncerrarTodas } from '../type/auth.type';

// Sessões Ativas (09-08-2026, Bloco E - Minha Conta > Segurança). Espelha
// nest/src/3-auth/controllers/auth.controller.sessoes.ts.
export const sessaoApi = {
  listar: (authFetch: AuthFetch): Promise<SessaoResponse[]> =>
    authFetch('/auth/sessoes').then(tratarResposta<SessaoResponse[]>),
  encerrarUma: (authFetch: AuthFetch, idSessao: number | string): Promise<void> =>
    authFetch(`/auth/sessoes/${idSessao}`, { method: 'DELETE' }).then(tratarResposta<void>),
  encerrarTodasMenosAtual: (authFetch: AuthFetch): Promise<SessaoResponseEncerrarTodas> =>
    authFetch('/auth/sessoes', { method: 'DELETE' }).then(
      tratarResposta<SessaoResponseEncerrarTodas>,
    ),
};
