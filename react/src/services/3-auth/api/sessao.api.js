import { tratarResposta } from '../../constant/api/http.util';

// Sessões Ativas (09-08-2026, Bloco E - Minha Conta > Segurança). Espelha
// nest/src/3-auth/controllers/auth.controller.sessoes.ts.
export const sessaoApi = {
  listar: (authFetch) => authFetch('/auth/sessoes').then(tratarResposta),
  encerrarUma: (authFetch, idSessao) =>
    authFetch(`/auth/sessoes/${idSessao}`, { method: 'DELETE' }).then(tratarResposta),
  encerrarTodasMenosAtual: (authFetch) =>
    authFetch('/auth/sessoes', { method: 'DELETE' }).then(tratarResposta),
};
