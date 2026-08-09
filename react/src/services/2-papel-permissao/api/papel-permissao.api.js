import { tratarResposta } from '../../constant/api/http.util';

// Espelha 2-papel-permissao (nest): papel/permissao continuam só leitura
// (catálogo gerenciado via seed/migração direta, de propósito — criar
// papel/permissão nova é decisão maior, fora de escopo aqui).
// papel_permissao ganhou atribuir/remover (03-08-2026) — a matriz Papel ×
// Permissão virou editável pra admin, mesmo padrão de usuarioPapelApi.
export const papelApi = {
  listar: (authFetch) => authFetch('/papel').then(tratarResposta),
  // Só `nome` é aceito (03-08-2026) — o `codigo` estável que o RBAC lê
  // nunca é exposto nem editável por aqui, de propósito.
  atualizar: (authFetch, idPapel, dados) =>
    authFetch(`/papel/${idPapel}`, {
      method: 'PATCH',
      body: JSON.stringify(dados),
    }).then(tratarResposta),
};

export const permissaoApi = {
  listar: (authFetch) => authFetch('/permissao').then(tratarResposta),
};

export const papelPermissaoApi = {
  listar: (authFetch) => authFetch('/papel-permissao').then(tratarResposta),
  atribuir: (authFetch, idPapel, idPermissao) =>
    authFetch('/papel-permissao', {
      method: 'POST',
      body: JSON.stringify({ idPapel, idPermissao }),
    }).then(tratarResposta),
  remover: (authFetch, idPapel, idPermissao) =>
    authFetch(`/papel-permissao/${idPapel}/${idPermissao}`, {
      method: 'DELETE',
    }).then(tratarResposta),
};

export const usuarioPapelApi = {
  // Sem filtro — todos os vínculos usuário↔papel de uma vez (RLS decide
  // sozinha quem vê o quê). Usado pela coluna "papel" na listagem de
  // Usuários, pra não disparar uma requisição por linha da tabela.
  listarTudo: (authFetch) => authFetch('/usuario-papel').then(tratarResposta),
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
  // Suspender/revogar UM papel por um tempo (09-08-2026, Bloco G) — em vez
  // de remover o vínculo: preserva quando foi atribuído, volta sozinho no
  // prazo. `ate` é ISO string.
  suspender: (authFetch, idUsuario, idPapel, ate) =>
    authFetch(`/usuario-papel/${idUsuario}/${idPapel}/suspender`, {
      method: 'POST',
      body: JSON.stringify({ ate }),
    }).then(tratarResposta),
  revogarSuspensao: (authFetch, idUsuario, idPapel) =>
    authFetch(`/usuario-papel/${idUsuario}/${idPapel}/revogar-suspensao`, {
      method: 'POST',
    }).then(tratarResposta),
};
