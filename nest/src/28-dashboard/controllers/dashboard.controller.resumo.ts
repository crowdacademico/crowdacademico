import { Controller, Get, UseGuards } from '@nestjs/common';
import { RequireAuthGuard } from '../../3-auth/guards/require-auth.guard';
import { DashboardServiceResumo } from '../service/dashboard.service.resumo';

// RequireAuthGuard desde 24-09-2026. Antes: "sem guard, este painel só é
// alcançado por admin" - mas a API atende qualquer requisição direta, e a
// resposta traz métricas internas (sessões ativas, denúncias pendentes).
// Guard só impede o anônimo; checar permissão administrativa (por exemplo
// relatorio_visualizar) também dentro de contar_metricas_dashboard() fica
// pendente (ver PENDENCIAS).
@UseGuards(RequireAuthGuard)
@Controller('dashboard')
export class DashboardControllerResumo {
  constructor(private readonly service: DashboardServiceResumo) {}

  @Get('resumo')
  resumo() {
    return this.service.executar();
  }
}
