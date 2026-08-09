import { tratarResposta } from '../../constant/api/http.util';

// GET /dashboard/resumo devolve TUDO que os cards/faixa de saúde/prévia de
// log precisam numa resposta só (nest/src/29-dashboard) — de propósito,
// pra dashboard.jsx não fazer 6 requisições soltas pra montar a tela.
// GET /health é chamado separado (já existia antes do dashboard, serve
// outro propósito: saúde de infra, não métrica de negócio) — reaproveitado
// aqui, não duplicado.
export const dashboardApi = {
  buscarResumo: (authFetch) => authFetch('/dashboard/resumo').then(tratarResposta),
  verificarSaude: (authFetch) => authFetch('/health').then(tratarResposta),
};
