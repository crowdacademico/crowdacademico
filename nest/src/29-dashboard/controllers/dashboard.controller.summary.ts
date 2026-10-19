import { Controller, Get } from '@nestjs/common';
import { DashboardServiceSummary } from '../service/dashboard.service.summary';

// Exige login (guarda global, não é @Publico()): a API atende qualquer requisição direta, e a resposta traz métricas internas (sessões
// ativas, denúncias pendentes); "este painel só é alcançado por admin" não protege a rota. O guard só impede o
// anônimo; quem decide é contar_metricas_dashboard(), que exige relatorio_visualizar (ERRCODE 92011, devolvido
// como 403).
@Controller('dashboard')
export class DashboardControllerSummary {
  constructor(private readonly service: DashboardServiceSummary) {}

  @Get('resumo')
  resumo() {
    return this.service.executar();
  }
}
