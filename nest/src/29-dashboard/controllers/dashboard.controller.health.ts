import { Controller, Get } from '@nestjs/common';
import { DashboardServiceHealth } from '../service/dashboard.service.health';

// GET /dashboard/saude: a aba Saúde do Dashboard (provedor de pagamento, e-mail e avisos do provedor). Exige login
// (guarda global) e relatorio_visualizar (conferida no serviço). Diferente de GET /health (público, só o banco, para a
// plataforma de deploy): esta rota fala com serviços de fora e mostra dados internos.
@Controller('dashboard')
export class DashboardControllerHealth {
  constructor(private readonly service: DashboardServiceHealth) {}

  @Get('saude')
  saude() {
    return this.service.executar();
  }
}
