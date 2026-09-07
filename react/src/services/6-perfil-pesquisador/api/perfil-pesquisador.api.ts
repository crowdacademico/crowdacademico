import { tratarResposta } from '../../constant/api/http.util';
import type { AuthFetch } from '../../3-auth/type/auth.type';
import type { ResultadoPaginado } from '../../constant/type/paginacao.type';
import type { StatusPesquisador, TipoVinculo } from '../constants/status-pesquisador.constants';
import type { PerfilPesquisadorResponse, PerfilPesquisadorResponseScore } from '../type/perfil-pesquisador.type';

// Espelha nest/src/6-perfil-pesquisador. GET é público no backend
// (pol_perfil_select usa usuario_visivel()) - CPF vem mascarado (`null`)
// pra quem não é o próprio dono nem tem perfil_pesquisador_visualizar_
// sensivel; o painel admin autenticado como quem tem essa permissão
// enxerga o CPF de todo mundo. Sem criar()/remover() aqui: criação é
// self-service (o próprio usuário vira pesquisador), sem endpoint de
// exclusão (status_pesquisador ativo/suspenso, nunca linha removida).
interface FiltroPerfilPesquisador {
  statusPesquisador?: StatusPesquisador;
  tipoVinculo?: TipoVinculo;
  tamanho?: number;
}

function paraQueryString(filtro?: FiltroPerfilPesquisador): string {
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
  listar: (authFetch: AuthFetch, filtro?: FiltroPerfilPesquisador): Promise<PerfilPesquisadorResponse[]> =>
    authFetch(`/perfil-pesquisador${paraQueryString({ tamanho: 500, ...filtro })}`)
      .then(tratarResposta<ResultadoPaginado<PerfilPesquisadorResponse>>)
      .then((resposta) => resposta.dados),
  buscar: (authFetch: AuthFetch, id: number | string): Promise<PerfilPesquisadorResponse> =>
    authFetch(`/perfil-pesquisador/${id}`).then(tratarResposta<PerfilPesquisadorResponse>),
  buscarScore: (authFetch: AuthFetch, id: number | string): Promise<PerfilPesquisadorResponseScore> =>
    authFetch(`/perfil-pesquisador/${id}/score`).then(tratarResposta<PerfilPesquisadorResponseScore>),
};
