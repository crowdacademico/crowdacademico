// Espelha nest/src/28-dashboard/dto/response/dashboard.response-summary.ts. `notificacoesPendentes` é `null`
// até 26-notificacao ser construído. Campos de campanha/denúncia/arrecadação: ver comentário completo no DTO
// Nest.
export interface DashboardResponseSummary {
  totalUsuarios: number;
  totalPesquisadores: number;
  totalPapeis: number;
  totalPermissoes: number;
  totalConfiguracoes: number;
  totalCampanhas: number;
  sessoesAtivas: number;
  notificacoesPendentes: null;
  campanhasAtivas: number;
  campanhasSucesso: number;
  campanhasNaoAtingida: number;
  campanhasAguardandoAprovacao: number;
  valorTotalArrecadado: number;
  denunciasPendentes: number;
  campanhasParaRevisaoScore: number;
}

// Espelha nest/src/app/health.controller.ts (sem DTO formal - objeto
// solto no controller).
export interface HealthResponse {
  status: 'ok' | 'erro';
  banco: 'conectado' | 'sem conexão';
}
