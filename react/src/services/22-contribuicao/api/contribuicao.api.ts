import { tratarResposta } from '../../constant/api/http.util';
import type { AuthFetch } from '../../3-auth/type/auth.type';
import type { MinhaContribuicao, ResumoContribuicoes } from '../type/contribuicao.type';

// Espelha nest/src/22-contribuicao.
const BASE = '/contribuicao';

export const contribuicaoApi = {
  // Quantas contribuições estão pagas e quantas existem. Só o dono da campanha ou quem tem a permissão (senão, 403).
  resumoDaCampanha: (authFetch: AuthFetch, idCampanha: number): Promise<ResumoContribuicoes> =>
    authFetch(`${BASE}/campanha/${idCampanha}/resumo`).then(tratarResposta<ResumoContribuicoes>),
  // O histórico de contribuições da conta logada (RF-009, RF-085), com a recompensa escolhida.
  minhas: (authFetch: AuthFetch): Promise<MinhaContribuicao[]> =>
    authFetch(`${BASE}/minhas`).then(tratarResposta<MinhaContribuicao[]>),
};
