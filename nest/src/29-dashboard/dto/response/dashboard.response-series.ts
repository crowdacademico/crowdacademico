// GET /dashboard/serie: os gráficos do Dashboard (serie_metricas_dashboard, 03 [03-M-2]). Um ponto por dia ou por mês,
// de `inicio` a `fim` (as datas usadas de fato: no agrupamento por mês, viram meses inteiros); `anterior` traz os totais
// do mesmo tanto de tempo logo antes, para comparar.
export interface PontoSerieDashboard {
  // Primeiro dia do dia/mês, AAAA-MM-DD (fuso de Brasília).
  inicio: string;
  arrecadado: number;
  apoios: number;
  cadastros: number;
}

export interface DashboardResponseSeries {
  agrupar: 'dia' | 'mes';
  pontos: PontoSerieDashboard[];
  anterior: { arrecadado: number; apoios: number; cadastros: number };
}
