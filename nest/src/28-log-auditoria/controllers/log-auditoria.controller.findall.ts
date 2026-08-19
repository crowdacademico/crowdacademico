import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { RequireAuthGuard } from '../../3-auth/guards/require-auth.guard';
import { LogAuditoriaRequestList } from '../dto/request/log-auditoria.request-list';
import { LogAuditoriaServiceFindAll } from '../service/log-auditoria.service.findall';

// RequireAuthGuard aqui é só pra devolver 401 limpo pra quem não está
// logado, em vez de uma lista vazia sem explicação — a autorização de
// verdade (só quem tem 'log_visualizar' vê alguma coisa) é RLS
// (pol_log_auditoria_select), roda de qualquer forma mesmo se este guard
// um dia sumir.
@Controller('log-auditoria')
export class LogAuditoriaControllerFindAll {
  constructor(private readonly service: LogAuditoriaServiceFindAll) {}

  @UseGuards(RequireAuthGuard)
  @Get()
  listar(@Query() query: LogAuditoriaRequestList) {
    return this.service.executar(query);
  }
}
