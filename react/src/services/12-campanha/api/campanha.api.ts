import { tratarResposta } from '../../constant/api/http.util';
import { paraQueryString } from '../../constant/api/query-string.util';
import type { AuthFetch } from '../../3-auth/type/auth.type';
import type { ResultadoPaginado } from '../../constant/type/paginacao.type';
import { desembrulharPaginado, TAMANHO_PAGINA_MAXIMO_API } from '../../constant/type/paginacao.type';
import type {
  CampanhaRequestCreate,
  CampanhaRequestUpdate,
  CampanhaResponse,
  HistoricoRejeicaoResponse,
} from '../type/campanha.type';
import type { StatusCampanha } from '../constants/status-campanha.constants';

// Espelha nest/src/12-campanha. GET é público no backend (pol_campanha_select mostra status
// público/dono/relatorio_visualizar, ver 04_rls_policies.sql [04-E]); aqui sempre passamos authFetch mesmo
// assim porque quem usa este arquivo é sempre o painel admin (logado), e o admin com relatorio_visualizar
// enxerga todos os status, não só os públicos. `criar()` cria em nome de quem está logado (Minhas Campanhas);
// `criarParaOutro()` é o endpoint de suporte/admin do Campo de Testes. `remover()` só funciona
// em campanha 'rascunho' (pol_campanha_delete, 04): depois de enviada para a fila, só dá para
// rejeitar/encerrar, nunca apagar de vez.
interface FiltroCampanha {
  status?: StatusCampanha;
  idAreaConhecimento?: number;
  idUsuario?: number;
  tamanho?: number;
}

export const campanhaApi = {
  // GET /campanha devolve { dados, total, pagina, tamanho } - `.dados`
  // desembrulhado aqui, mesmo padrão de usuarioApi.listar. `tamanho: 500`
  // por padrão (mesmo teto de segurança de paginacao.util.ts no backend)
  // pra GenericTable continuar paginando no navegador, como já faz em
  // toda outra tela.
  listar: (authFetch: AuthFetch, filtro?: FiltroCampanha): Promise<CampanhaResponse[]> =>
    authFetch(`/campanha${paraQueryString({ tamanho: TAMANHO_PAGINA_MAXIMO_API, ...filtro })}`)
      .then(tratarResposta<ResultadoPaginado<CampanhaResponse>>)
      .then(desembrulharPaginado('campanhas')),
  buscar: (authFetch: AuthFetch, id: number | string): Promise<CampanhaResponse> =>
    authFetch(`/campanha/${id}`).then(tratarResposta<CampanhaResponse>),
  criar: (authFetch: AuthFetch, dados: CampanhaRequestCreate): Promise<CampanhaResponse> =>
    authFetch('/campanha', { method: 'POST', body: JSON.stringify(dados) }).then(tratarResposta<CampanhaResponse>),
  criarParaOutro: (authFetch: AuthFetch, idUsuario: number, dados: CampanhaRequestCreate): Promise<CampanhaResponse> =>
    authFetch(`/campanha/${idUsuario}`, { method: 'POST', body: JSON.stringify(dados) }).then(
      tratarResposta<CampanhaResponse>,
    ),
  atualizar: (authFetch: AuthFetch, id: number | string, dados: CampanhaRequestUpdate): Promise<CampanhaResponse> =>
    authFetch(`/campanha/${id}`, { method: 'PATCH', body: JSON.stringify(dados) }).then(
      tratarResposta<CampanhaResponse>,
    ),
  // Rascunho vai para a fila; rejeitada é reenviada. O banco cobra orçamento, cronograma e prazo aqui.
  enviar: (authFetch: AuthFetch, id: number | string): Promise<CampanhaResponse> =>
    authFetch(`/campanha/${id}/enviar`, { method: 'POST' }).then(tratarResposta<CampanhaResponse>),
  // Prazo vencido: começa na nova data mantendo a duração (o fim e os marcos andam junto, no banco).
  deslizarDatas: (authFetch: AuthFetch, id: number | string, novaDataInicio: string): Promise<CampanhaResponse> =>
    authFetch(`/campanha/${id}/deslizar-datas`, { method: 'POST', body: JSON.stringify({ novaDataInicio }) }).then(
      tratarResposta<CampanhaResponse>,
    ),
  aprovar: (authFetch: AuthFetch, id: number | string): Promise<void> =>
    authFetch(`/campanha/${id}/aprovar`, { method: 'POST' }).then(tratarResposta<void>),
  rejeitar: (authFetch: AuthFetch, id: number | string, justificativa: string): Promise<void> =>
    authFetch(`/campanha/${id}/rejeitar`, { method: 'POST', body: JSON.stringify({ justificativa }) }).then(tratarResposta<void>),
  remover: (authFetch: AuthFetch, id: number | string): Promise<void> =>
    authFetch(`/campanha/${id}`, { method: 'DELETE' }).then(tratarResposta<void>),
  // Histórico de rejeições ("onde fica registrado" o motivo): mais recente primeiro, mesmo padrão de
  // usuarioApi.listarTermosAceitos. Endpoint próprio (21-historico-rejeicao), não aninhado em /campanha: mesmo
  // motivo de orcamento-campanha/marco-cronograma (GET /historico-rejeicao?idCampanha=).
  listarHistoricoRejeicao: (
    authFetch: AuthFetch,
    idCampanha: number | string,
  ): Promise<HistoricoRejeicaoResponse[]> =>
    authFetch(`/historico-rejeicao?idCampanha=${idCampanha}`).then(
      tratarResposta<HistoricoRejeicaoResponse[]>,
    ),
};
