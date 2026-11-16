import { tratarResposta } from '../../constant/api/http.util';
import type { AuthFetch } from '../../3-auth/type/auth.type';
import type { DashboardResponseHealth, DashboardResponseSummary, HealthResponse } from '../type/dashboard.type';

// GET /dashboard/resumo devolve TUDO que os cards/faixa de saúde/prévia de
// log precisam numa resposta só (nest/src/29-dashboard) - de propósito,
// pra dashboard.tsx não fazer 6 requisições soltas pra montar a tela.
// GET /health é chamado separado (já existia antes do dashboard, serve
// outro propósito: saúde de infra, não métrica de negócio) - reaproveitado
// aqui, não duplicado.
export const dashboardApi = {
  buscarResumo: (authFetch: AuthFetch): Promise<DashboardResponseSummary> =>
    authFetch('/dashboard/resumo').then(tratarResposta<DashboardResponseSummary>),
  verificarSaude: (authFetch: AuthFetch): Promise<HealthResponse> =>
    authFetch('/health').then(tratarResposta<HealthResponse>),
  // Aba Saúde: confere na hora o provedor de pagamento, o de e-mail e os avisos do provedor (pode levar alguns segundos).
  verificarServicos: (authFetch: AuthFetch): Promise<DashboardResponseHealth> =>
    authFetch('/dashboard/saude').then(tratarResposta<DashboardResponseHealth>),
};
