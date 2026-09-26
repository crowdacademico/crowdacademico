import { Controller, Get, UseGuards } from '@nestjs/common';
import { RequireAuthGuard } from '../../3-auth/guards/require-auth.guard';
import { DashboardServiceResumo } from '../service/dashboard.service.resumo';

// RequireAuthGuard: a API atende qualquer requisição direta, e a resposta traz métricas internas (sessões
// ativas, denúncias pendentes); "este painel só é alcançado por admin" não protege a rota. O guard só impede o
// anônimo; quem decide é contar_metricas_dashboard(), que exige relatorio_visualizar (ERRCODE 92011, devolvido
// como 403).
@UseGuards(RequireAuthGuard)
@Controller('dashboard')
export class DashboardControllerResumo {
  constructor(private readonly service: DashboardServiceResumo) {}

  @Get('resumo')
  resumo() {
    return this.service.executar();
  }
}
