import { tratarResposta } from '../../constant/api/http.util';
import type { AuthFetch } from '../../3-auth/type/auth.type';
import type {
  ContribuicaoRecebida,
  ApoiosPublicosCampanha,
  MinhaContribuicao,
  ResumoContribuicoes,
} from '../type/contribuicao.type';

// Espelha nest/src/22-contribuicao.
const BASE = '/contribuicao';

export const contribuicaoApi = {
  // Contagem agregada de contribuições pagas de uma campanha publicada; não retorna dados de apoiadores.
  apoiosPublicosCampanha: (authFetch: AuthFetch, idCampanha: number): Promise<ApoiosPublicosCampanha> =>
    authFetch(`${BASE}/campanha/${idCampanha}/apoios`).then(tratarResposta<ApoiosPublicosCampanha>),
  // Quantas contribuições estão pagas e quantas existem. Só o dono da campanha ou quem tem a permissão (senão, 403).
  resumoDaCampanha: (authFetch: AuthFetch, idCampanha: number): Promise<ResumoContribuicoes> =>
    authFetch(`${BASE}/campanha/${idCampanha}/resumo`).then(tratarResposta<ResumoContribuicoes>),
  // O histórico de contribuições da conta logada (RF-009, RF-089), com a recompensa escolhida.
  minhas: (authFetch: AuthFetch): Promise<MinhaContribuicao[]> =>
    authFetch(`${BASE}/minhas`).then(tratarResposta<MinhaContribuicao[]>),
  // Apoios recebidos nas campanhas do pesquisador; identidades anônimas são omitidas no servidor.
  recebidas: (authFetch: AuthFetch): Promise<ContribuicaoRecebida[]> =>
    authFetch(`${BASE}/recebidas`).then(tratarResposta<ContribuicaoRecebida[]>),
};
