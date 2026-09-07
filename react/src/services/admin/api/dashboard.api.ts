import { tratarResposta } from '../../constant/api/http.util';
import type { AuthFetch } from '../../3-auth/type/auth.type';
import type { DashboardResponseSummary, HealthResponse } from '../type/dashboard.type';

// GET /dashboard/resumo devolve TUDO que os cards/faixa de saúde/prévia de
// log precisam numa resposta só (nest/src/28-dashboard) - de propósito,
// pra dashboard.jsx não fazer 6 requisições soltas pra montar a tela.
// GET /health é chamado separado (já existia antes do dashboard, serve
// outro propósito: saúde de infra, não métrica de negócio) - reaproveitado
// aqui, não duplicado.
export const dashboardApi = {
  buscarResumo: (authFetch: AuthFetch): Promise<DashboardResponseSummary> =>
    authFetch('/dashboard/resumo').then(tratarResposta<DashboardResponseSummary>),
  verificarSaude: (authFetch: AuthFetch): Promise<HealthResponse> =>
    authFetch('/health').then(tratarResposta<HealthResponse>),
};
