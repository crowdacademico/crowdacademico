import { tratarResposta } from '../../constant/api/http.util';

// Espelha nest/src/6-perfil-pesquisador. GET é público no backend
// (pol_perfil_select usa usuario_visivel()) - CPF vem mascarado (`null`)
// pra quem não é o próprio dono nem tem perfil_pesquisador_visualizar_
// sensivel; o painel admin autenticado como quem tem essa permissão
// enxerga o CPF de todo mundo. Sem criar()/remover() aqui: criação é
// self-service (o próprio usuário vira pesquisador), sem endpoint de
// exclusão (status_pesquisador ativo/suspenso, nunca linha removida).
function paraQueryString(filtro) {
  if (!filtro) {
    return '';
  }
  const params = new URLSearchParams();
  if (filtro.statusPesquisador !== undefined) params.set('statusPesquisador', filtro.statusPesquisador);
  if (filtro.tipoVinculo !== undefined) params.set('tipoVinculo', filtro.tipoVinculo);
  if (filtro.tamanho !== undefined) params.set('tamanho', String(filtro.tamanho));
  const texto = params.toString();
  return texto ? `?${texto}` : '';
}

export const perfilPesquisadorApi = {
  listar: (authFetch, filtro) =>
    authFetch(`/perfil-pesquisador${paraQueryString({ tamanho: 500, ...filtro })}`)
      .then(tratarResposta)
      .then((resposta) => resposta.dados),
  buscar: (authFetch, id) => authFetch(`/perfil-pesquisador/${id}`).then(tratarResposta),
  buscarScore: (authFetch, id) => authFetch(`/perfil-pesquisador/${id}/score`).then(tratarResposta),
};
