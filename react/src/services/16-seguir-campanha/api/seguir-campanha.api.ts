import { tratarResposta } from '../../constant/api/http.util';
import type { AuthFetch } from '../../3-auth/type/auth.type';
import type { SeguirCampanhaResponse } from '../type/seguir-campanha.type';

// Espelha nest/src/16-seguir-campanha. A lista é sempre a da conta logada (pol_seg_campanha_select, 04).
export const seguirCampanhaApi = {
  listarMinhas: (authFetch: AuthFetch): Promise<SeguirCampanhaResponse[]> =>
    authFetch('/seguir-campanha').then(tratarResposta<SeguirCampanhaResponse[]>),
  seguir: (authFetch: AuthFetch, idCampanha: number): Promise<SeguirCampanhaResponse> =>
    authFetch('/seguir-campanha', { method: 'POST', body: JSON.stringify({ idCampanha }) }).then(
      tratarResposta<SeguirCampanhaResponse>,
    ),
  deixarDeSeguir: (authFetch: AuthFetch, idCampanha: number): Promise<void> =>
    authFetch(`/seguir-campanha/${idCampanha}`, { method: 'DELETE' }).then(tratarResposta<void>),
};
