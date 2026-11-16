import { IsIn, IsOptional, Matches } from 'class-validator';

// GET /dashboard/serie?inicio=AAAA-MM-DD&fim=AAAA-MM-DD&agrupar=dia|mes: as datas que o admin escolhe no gráfico.
// Sem datas, os últimos 30 dias; sem agrupar, dia a dia.
export const AGRUPAMENTOS_SERIE_DASHBOARD = ['dia', 'mes'] as const;
const DATA = /^\d{4}-\d{2}-\d{2}$/;

export class DashboardRequestSeries {
  @IsOptional()
  @Matches(DATA, {
    message: 'A data de início precisa estar no formato AAAA-MM-DD.',
  })
  inicio?: string;

  @IsOptional()
  @Matches(DATA, {
    message: 'A data de fim precisa estar no formato AAAA-MM-DD.',
  })
  fim?: string;

  @IsOptional()
  @IsIn(AGRUPAMENTOS_SERIE_DASHBOARD, { message: 'Agrupe por dia ou por mês.' })
  agrupar?: (typeof AGRUPAMENTOS_SERIE_DASHBOARD)[number];
}
