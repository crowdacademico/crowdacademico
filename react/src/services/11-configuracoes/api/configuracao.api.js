import { tratarResposta } from '../../constant/api/http.util';

export const configuracaoApi = {
  listar: (authFetch) => authFetch('/configuracoes').then(tratarResposta),
  criar: (authFetch, dados) =>
    authFetch('/configuracoes', {
      method: 'POST',
      body: JSON.stringify(dados),
    }).then(tratarResposta),
  atualizar: (authFetch, id, dados) =>
    authFetch(`/configuracoes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(dados),
    }).then(tratarResposta),
  remover: (authFetch, id) =>
    authFetch(`/configuracoes/${id}`, { method: 'DELETE' }).then(tratarResposta),
};
