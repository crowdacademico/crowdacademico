import { tratarResposta } from '../../constant/api/http.util';
import type { AuthFetch } from '../../3-auth/type/auth.type';
import type { SeguidoresPesquisadorResponse, SeguirPesquisadorResponse } from '../type/seguir-pesquisador.type';

// Espelha nest/src/16-seguir (rotas /seguir-pesquisador, RF-028). A lista é sempre a da conta logada
// (pol_seg_pesq_select, 04); a contagem de seguidores é pública (a página do perfil mostra o número, nunca quem segue).
export const seguirPesquisadorApi = {
  listarMinhas: (authFetch: AuthFetch): Promise<SeguirPesquisadorResponse[]> =>
    authFetch('/seguir-pesquisador').then(tratarResposta<SeguirPesquisadorResponse[]>),
  seguir: (authFetch: AuthFetch, idPesquisador: number): Promise<SeguirPesquisadorResponse> =>
    authFetch('/seguir-pesquisador', { method: 'POST', body: JSON.stringify({ idPesquisador }) }).then(
      tratarResposta<SeguirPesquisadorResponse>,
    ),
  deixarDeSeguir: (authFetch: AuthFetch, idPesquisador: number): Promise<void> =>
    authFetch(`/seguir-pesquisador/${idPesquisador}`, { method: 'DELETE' }).then(tratarResposta<void>),
  contarSeguidores: (authFetch: AuthFetch, idPesquisador: number): Promise<SeguidoresPesquisadorResponse> =>
    authFetch(`/seguir-pesquisador/${idPesquisador}/seguidores`).then(tratarResposta<SeguidoresPesquisadorResponse>),
};
