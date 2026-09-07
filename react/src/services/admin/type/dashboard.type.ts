// Espelha nest/src/28-dashboard/dto/response/dashboard.response-summary.ts.
// `notificacoesPendentes` continua `null` até 26-notificacao ser
// construído - ver ACHADOS_PARA_DISCUTIR.md, item 6.
export interface DashboardResponseSummary {
  totalUsuarios: number;
  totalPesquisadores: number;
  totalPapeis: number;
  totalPermissoes: number;
  totalConfiguracoes: number;
  totalCampanhas: number;
  sessoesAtivas: number;
  notificacoesPendentes: null;
}

// Espelha nest/src/app/health.controller.ts (sem DTO formal - objeto
// solto no controller).
export interface HealthResponse {
  status: 'ok' | 'erro';
  banco: 'conectado' | 'sem conexão';
}
