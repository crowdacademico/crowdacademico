import { Controller, Get, Query } from '@nestjs/common';
import { DashboardRequestSeries } from '../dto/request/dashboard.request-series';
import { DashboardServiceSeries } from '../service/dashboard.service.series';

// GET /dashboard/serie?inicio=&fim=&agrupar=dia|mes: os gráficos do Dashboard (arrecadação e cadastros ao longo do tempo). Exige login
// (guarda global); a permissão relatorio_visualizar é conferida por serie_metricas_dashboard (92011, devolvido como 403).
@Controller('dashboard')
export class DashboardControllerSeries {
  constructor(private readonly service: DashboardServiceSeries) {}

  @Get('serie')
  serie(@Query() filtro: DashboardRequestSeries) {
    return this.service.executar(filtro);
  }
}
