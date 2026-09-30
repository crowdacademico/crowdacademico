import { tratarResposta } from '../../constant/api/http.util';
import type { AuthFetch } from '../../3-auth/type/auth.type';
import type { ResultadoPaginado } from '../../constant/type/paginacao.type';
import type { ComentarioResponse } from '../type/comentario.type';

// Espelha nest/src/17-comentario. Quem pode o quê é decidido pelo banco (pol_comentario_*, 04): o dono da campanha
// endossa, exclui (apaga de vez) e bloqueia (inativo: fica guardado e o autor não comenta mais naquela campanha); a
// lista esconde do dono o comentário bloqueado. O autor não é avisado de nenhuma dessas ações (RF-093).
export const comentarioApi = {
  listar: (authFetch: AuthFetch, idCampanha: number): Promise<ComentarioResponse[]> =>
    authFetch(`/comentario?idCampanha=${idCampanha}&tamanho=500`)
      .then(tratarResposta<ResultadoPaginado<ComentarioResponse>>)
      .then((resultado) => resultado.dados),
  alternarEndosso: (authFetch: AuthFetch, id: number, endossado: boolean): Promise<ComentarioResponse> =>
    authFetch(`/comentario/${id}`, { method: 'PATCH', body: JSON.stringify({ endossado }) }).then(
      tratarResposta<ComentarioResponse>,
    ),
  excluir: (authFetch: AuthFetch, id: number): Promise<void> =>
    authFetch(`/comentario/${id}`, { method: 'DELETE' }).then(tratarResposta<void>),
  bloquear: (authFetch: AuthFetch, id: number): Promise<ComentarioResponse> =>
    authFetch(`/comentario/${id}`, { method: 'PATCH', body: JSON.stringify({ ativo: false }) }).then(
      tratarResposta<ComentarioResponse>,
    ),
};
