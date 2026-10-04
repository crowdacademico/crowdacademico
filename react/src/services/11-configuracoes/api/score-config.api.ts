import { tratarResposta } from '../../constant/api/http.util';
import type { AuthFetch } from '../../3-auth/type/auth.type';
import type { ScoreConfigResponse, ScoreFaixaResponse, ScoreItemPesoRequest } from '../type/score-config.type';

// Pesos e faixas do score. Salvar manda tudo de uma vez: o banco confere a soma 100 e a cobertura de 0 a 100 no
// estado final, e recalcula a pontuação de todos os pesquisadores uma vez só.
export const scoreConfigApi = {
  buscar: (authFetch: AuthFetch): Promise<ScoreConfigResponse> =>
    authFetch('/score-config').then(tratarResposta<ScoreConfigResponse>),
  salvarPesos: (authFetch: AuthFetch, itens: ScoreItemPesoRequest[]): Promise<ScoreConfigResponse> =>
    authFetch('/score-config/pesos', { method: 'PATCH', body: JSON.stringify({ itens }) }).then(
      tratarResposta<ScoreConfigResponse>,
    ),
  salvarFaixas: (authFetch: AuthFetch, faixas: ScoreFaixaResponse[]): Promise<ScoreConfigResponse> =>
    authFetch('/score-config/faixas', { method: 'PATCH', body: JSON.stringify({ faixas }) }).then(
      tratarResposta<ScoreConfigResponse>,
    ),
};
