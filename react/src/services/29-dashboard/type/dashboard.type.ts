// Espelha nest/src/29-dashboard/dto/response/dashboard.response-summary.ts. Campos de campanha/denúncia/arrecadação
// e de e-mail: ver comentário completo no DTO Nest.
export interface DashboardResponseSummary {
  totalUsuarios: number;
  totalPesquisadores: number;
  totalPapeis: number;
  totalPermissoes: number;
  totalConfiguracoes: number;
  totalCampanhas: number;
  sessoesAtivas: number;
  notificacoesPendentes: number;
  notificacoesComFalha: number;
  campanhasAtivas: number;
  campanhasSucesso: number;
  campanhasNaoAtingida: number;
  campanhasAguardandoAprovacao: number;
  valorTotalArrecadado: number;
  denunciasPendentes: number;
  campanhasParaRevisaoScore: number;
  eventosPagamentoEmRevisao: number;
  encerramentosPendentes: number;
}

// Espelha nest/src/app/health.controller.ts (sem DTO formal - objeto
// solto no controller).
export interface HealthResponse {
  status: 'ok' | 'erro';
  banco: 'conectado' | 'sem conexão';
}

// Espelha nest/src/29-dashboard/dto/response/dashboard.response-health.ts (GET /dashboard/saude, aba Saúde).
export interface VerificacaoServicoExterno {
  ok: boolean;
  mensagem: string;
  ms: number;
}

export interface DashboardResponseHealth {
  pagamento: VerificacaoServicoExterno & {
    provedor: string;
    ambiente: 'sandbox' | 'producao' | 'teste' | null;
    saldo: number | null;
  };
  email: VerificacaoServicoExterno & {
    provedor: string;
    redirecionado: boolean;
  };
  verificadoEm: string;
}

// Espelha nest/src/29-dashboard/dto/response/dashboard.response-series.ts (GET /dashboard/serie, os gráficos).
// Pedido do gráfico: as datas (AAAA-MM-DD) e se agrupa por dia ou por mês.
export type AgruparSerieDashboard = 'dia' | 'mes';

export interface FiltroSerieDashboard {
  inicio: string;
  fim: string;
  agrupar: AgruparSerieDashboard;
}

export interface PontoSerieDashboard {
  // Primeiro dia do dia/mês, AAAA-MM-DD (fuso de Brasília).
  inicio: string;
  arrecadado: number;
  apoios: number;
  cadastros: number;
}

export interface DashboardResponseSeries {
  agrupar: AgruparSerieDashboard;
  pontos: PontoSerieDashboard[];
  anterior: { arrecadado: number; apoios: number; cadastros: number };
}
