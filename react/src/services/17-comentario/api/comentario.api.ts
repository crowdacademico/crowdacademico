import { tratarResposta } from '../../constant/api/http.util';
import type { AuthFetch } from '../../3-auth/type/auth.type';
import type { ResultadoPaginado } from '../../constant/type/paginacao.type';
import { desembrulharPaginado, TAMANHO_PAGINA_MAXIMO_API } from '../../constant/type/paginacao.type';
import type { ComentarioMeuResponse, ComentarioModeracaoResponse, ComentarioResponse } from '../type/comentario.type';

// Espelha nest/src/17-comentario. Quem pode o quê é decidido pelo banco (pol_comentario_*, 04): o dono da campanha
// endossa, exclui (sai da lista dele, fica guardado para a moderação, e o autor pode comentar de novo) e exclui e
// bloqueia (também guardado, e o autor não comenta mais naquela campanha). Só a moderação apaga de vez (21-11-2026). O autor não é avisado de nenhuma dessas ações (RF-094).
export const comentarioApi = {
  listarMinhas: (authFetch: AuthFetch): Promise<ComentarioMeuResponse[]> =>
    authFetch(`/comentario/minhas?tamanho=${TAMANHO_PAGINA_MAXIMO_API}`)
      .then(tratarResposta<ResultadoPaginado<ComentarioMeuResponse>>)
      .then(desembrulharPaginado('comentários feitos')),
  // Comenta como a conta logada: só pesquisador ativo, nunca na própria campanha, um por campanha (regras do banco).
  criar: (authFetch: AuthFetch, idCampanha: number, conteudo: string): Promise<ComentarioResponse> =>
    authFetch('/comentario', { method: 'POST', body: JSON.stringify({ idCampanha, conteudo }) }).then(
      tratarResposta<ComentarioResponse>,
    ),
  // Uma página da lista (gestão, página pública): `endossado` true traz só os endossados, na ordem do endosso.
  listarPagina: (
    authFetch: AuthFetch,
    idCampanha: number,
    pagina: number,
    tamanho: number,
    endossado?: boolean,
  ): Promise<ResultadoPaginado<ComentarioResponse>> =>
    authFetch(
      `/comentario?idCampanha=${idCampanha}&pagina=${pagina}&tamanho=${tamanho}${endossado === undefined ? '' : `&endossado=${endossado}`}`,
    ).then(tratarResposta<ResultadoPaginado<ComentarioResponse>>),
  listar: (authFetch: AuthFetch, idCampanha: number): Promise<ComentarioResponse[]> =>
    authFetch(`/comentario?idCampanha=${idCampanha}&tamanho=500`)
      .then(tratarResposta<ResultadoPaginado<ComentarioResponse>>)
      .then((resultado) => resultado.dados),
  alternarEndosso: (authFetch: AuthFetch, id: number, endossado: boolean): Promise<ComentarioResponse> =>
    authFetch(`/comentario/${id}`, { method: 'PATCH', body: JSON.stringify({ endossado }) }).then(
      tratarResposta<ComentarioResponse>,
    ),
  // Exclusão lógica (21-11-2026): sai do ar e do endosso, e fica guardado para a moderação.
  excluir: (authFetch: AuthFetch, id: number): Promise<void> =>
    authFetch(`/comentario/${id}`, { method: 'PATCH', body: JSON.stringify({ ativo: false, endossado: false }) })
      .then(tratarResposta<ComentarioResponse>)
      .then(() => undefined),
  // Moderação (18-11-2026): todos os comentários, de todas as campanhas, o mais novo primeiro.
  listarModeracao: (authFetch: AuthFetch): Promise<ComentarioModeracaoResponse[]> =>
    authFetch('/comentario/moderacao?limite=500').then(tratarResposta<ComentarioModeracaoResponse[]>),
  // Ocultar tira do ar e tira o endosso (sai da página pública); mostrar de novo devolve sem endosso (o dono da
  // campanha decide se endossa outra vez). Só a moderação devolve ao ar um comentário oculto (regra do banco).
  ocultarModeracao: (authFetch: AuthFetch, id: number): Promise<ComentarioResponse> =>
    authFetch(`/comentario/${id}`, { method: 'PATCH', body: JSON.stringify({ ativo: false, endossado: false }) }).then(
      tratarResposta<ComentarioResponse>,
    ),
  mostrarModeracao: (authFetch: AuthFetch, id: number): Promise<ComentarioResponse> =>
    authFetch(`/comentario/${id}`, { method: 'PATCH', body: JSON.stringify({ ativo: true }) }).then(
      tratarResposta<ComentarioResponse>,
    ),
  bloquear: (authFetch: AuthFetch, id: number): Promise<ComentarioResponse> =>
    authFetch(`/comentario/${id}`, { method: 'PATCH', body: JSON.stringify({ ativo: false, endossado: false, bloqueado: true }) }).then(
      tratarResposta<ComentarioResponse>,
    ),
};
