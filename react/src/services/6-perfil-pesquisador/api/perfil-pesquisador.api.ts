import { tratarResposta } from '../../constant/api/http.util';
import type { AuthFetch } from '../../3-auth/type/auth.type';
import type { ResultadoPaginado } from '../../constant/type/paginacao.type';
import type { StatusPesquisador, TipoVinculo } from '../constants/status-pesquisador.constants';
import type {
  PerfilPesquisadorRequestCorrigirCpf,
  PerfilPesquisadorRequestCreate,
  PerfilPesquisadorRequestSuspender,
  PerfilPesquisadorRequestUpdate,
  PerfilPesquisadorResponse,
  PerfilPesquisadorResponseScore,
  PerfilPesquisadorResponseSuspend,
} from '../type/perfil-pesquisador.type';

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
  criar: (authFetch: AuthFetch, dados: PerfilPesquisadorRequestCreate): Promise<PerfilPesquisadorResponse> =>
    authFetch('/perfil-pesquisador', {
      method: 'POST',
      body: JSON.stringify(dados),
    }).then(tratarResposta<PerfilPesquisadorResponse>),
  // Endpoint separado de criar() acima, de propósito (07-09-2026) - criar()
  // é self-service (sempre a própria conta logada, pol_perfil_insert exige
  // id_usuario = id_usuario_atual()); esta é a ação de suporte/admin,
  // gateada por 'perfil_pesquisador_criar_para_outro' dentro da função do
  // banco - cria perfil EM NOME de outro usuário.
  criarParaOutro: (
    authFetch: AuthFetch,
    id: number | string,
    dados: PerfilPesquisadorRequestCreate,
  ): Promise<PerfilPesquisadorResponse> =>
    authFetch(`/perfil-pesquisador/${id}`, {
      method: 'POST',
      body: JSON.stringify(dados),
    }).then(tratarResposta<PerfilPesquisadorResponse>),
  atualizar: (
    authFetch: AuthFetch,
    id: number | string,
    dados: PerfilPesquisadorRequestUpdate,
  ): Promise<PerfilPesquisadorResponse> =>
    authFetch(`/perfil-pesquisador/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(dados),
    }).then(tratarResposta<PerfilPesquisadorResponse>),
  // Endpoint separado do atualizar() acima, de propósito (07-09-2026,
  // RF-017) - correção de CPF é ação de suporte/admin
  // (perfil_pesquisador_corrigir_cpf), nunca um PATCH comum.
  corrigirCpf: (authFetch: AuthFetch, id: number | string, dados: PerfilPesquisadorRequestCorrigirCpf): Promise<void> =>
    authFetch(`/perfil-pesquisador/${id}/cpf`, {
      method: 'PATCH',
      body: JSON.stringify(dados),
    }).then(tratarResposta<void>),
  // Suspende só o PODER de pesquisador (login continua funcionando) - mesmo
  // formato de usuarioApi.suspender/buscarSuspensao/revogarSuspensao
  // (07-09-2026, pedido do Lucas: mesmo padrão de Moderação de usuário).
  buscarSuspensao: (authFetch: AuthFetch, id: number | string): Promise<PerfilPesquisadorResponseSuspend> =>
    authFetch(`/perfil-pesquisador/${id}/suspensao`).then(tratarResposta<PerfilPesquisadorResponseSuspend>),
  suspender: (authFetch: AuthFetch, id: number | string, dados: PerfilPesquisadorRequestSuspender): Promise<void> =>
    authFetch(`/perfil-pesquisador/${id}/suspender`, {
      method: 'POST',
      body: JSON.stringify(dados),
    }).then(tratarResposta<void>),
  reativar: (authFetch: AuthFetch, id: number | string): Promise<void> =>
    authFetch(`/perfil-pesquisador/${id}/reativar`, { method: 'POST' }).then(tratarResposta<void>),
};
