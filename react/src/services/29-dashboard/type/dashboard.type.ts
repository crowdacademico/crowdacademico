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
  avisosPagamento: {
    visivel: boolean;
    ultimoRecebidoEm: string | null;
    emRevisao: number;
    comErro: number;
  };
  verificadoEm: string;
}
