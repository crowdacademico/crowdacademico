import { tratarResposta } from '../../constant/api/http.util';
import type { AuthFetch } from '../../3-auth/type/auth.type';
import type { ResumoContribuicoes } from '../type/contribuicao.type';

// Espelha nest/src/22-contribuicao.
const BASE = '/contribuicao';

export const contribuicaoApi = {
  // Quantas e quanto por meio de pagamento e situação. Só o dono da campanha ou quem tem a permissão (senão, 403).
  resumoDaCampanha: (authFetch: AuthFetch, idCampanha: number): Promise<ResumoContribuicoes[]> =>
    authFetch(`${BASE}/campanha/${idCampanha}/resumo`).then(tratarResposta<ResumoContribuicoes[]>),
};
