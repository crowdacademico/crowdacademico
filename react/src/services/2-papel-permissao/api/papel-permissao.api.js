import { tratarResposta } from '../../constant/api/http.util';

// Espelha 2-papel-permissao (nest): papel/permissao/papel_permissao são só
// leitura (sem GRANT de escrita no banco — catálogo de RBAC gerenciado
// direto no Postgres, nunca pela API, de propósito). Só usuario_papel tem
// criar/remover (atribuir/revogar papel de um usuário).
export const papelApi = {
  listar: (authFetch) => authFetch('/papel').then(tratarResposta),
};

export const permissaoApi = {
  listar: (authFetch) => authFetch('/permissao').then(tratarResposta),
};

export const papelPermissaoApi = {
  listar: (authFetch) => authFetch('/papel-permissao').then(tratarResposta),
};

export const usuarioPapelApi = {
  listarPorUsuario: (authFetch, idUsuario) =>
    authFetch(`/usuario-papel/${idUsuario}`).then(tratarResposta),
  atribuir: (authFetch, idUsuario, idPapel) =>
    authFetch('/usuario-papel', {
      method: 'POST',
      body: JSON.stringify({ idUsuario, idPapel }),
    }).then(tratarResposta),
  remover: (authFetch, idUsuario, idPapel) =>
    authFetch(`/usuario-papel/${idUsuario}/${idPapel}`, {
      method: 'DELETE',
    }).then(tratarResposta),
};
