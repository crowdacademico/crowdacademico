import { Controller, Get } from '@nestjs/common';
import { DashboardServiceResumo } from '../service/dashboard.service.resumo';

// Sem guard, mesmo raciocínio já usado em usuario/papel/permissao/
// usuario-papel findall: este painel só é alcançado por admin, em nenhum
// fluxo do sistema um usuario/pesquisador chega perto de /admin/*. A
// autorização de verdade dos números individuais continua vindo da RLS
// (log_auditoria) e da SECURITY DEFINER (o resto, ver [03-K]).
@Controller('dashboard')
export class DashboardControllerResumo {
  constructor(private readonly service: DashboardServiceResumo) {}

  @Get('resumo')
  resumo() {
    return this.service.executar();
  }
}
