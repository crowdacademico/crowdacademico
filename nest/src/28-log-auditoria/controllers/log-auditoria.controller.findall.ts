import { Controller, Get, Query } from '@nestjs/common';
import { LogAuditoriaRequestList } from '../dto/request/log-auditoria.request-list';
import { LogAuditoriaServiceFindAll } from '../service/log-auditoria.service.findall';

// Exigir login (guarda global) é só para devolver 401 limpo a quem não está logado, em vez de uma lista vazia sem
// explicação: a autorização de verdade (só quem tem 'log_visualizar' vê alguma coisa) é RLS
// (pol_log_auditoria_select), roda de qualquer forma mesmo se este guard um dia sumir.
@Controller('log-auditoria')
export class LogAuditoriaControllerFindAll {
  constructor(private readonly service: LogAuditoriaServiceFindAll) {}

  @Get()
  listar(@Query() query: LogAuditoriaRequestList) {
    return this.service.executar(query);
  }
}
