import { tratarResposta } from '../../constant/api/http.util';

// authFetch vem de use-auth.js (services/3-auth/hook) — injetado, não
// importado direto, pra este arquivo não precisar saber nada de token.
export const usuarioApi = {
  listar: (authFetch) => authFetch('/usuario').then(tratarResposta),
  buscar: (authFetch, id) => authFetch(`/usuario/${id}`).then(tratarResposta),
  criar: (authFetch, dados) =>
    authFetch('/usuario', { method: 'POST', body: JSON.stringify(dados) }).then(
      tratarResposta,
    ),
  atualizar: (authFetch, id, dados) =>
    authFetch(`/usuario/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(dados),
    }).then(tratarResposta),
  remover: (authFetch, id) =>
    authFetch(`/usuario/${id}`, { method: 'DELETE' }).then(tratarResposta),
};
