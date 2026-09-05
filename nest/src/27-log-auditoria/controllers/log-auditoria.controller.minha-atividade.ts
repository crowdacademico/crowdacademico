import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { RequireAuthGuard } from '../../3-auth/guards/require-auth.guard';
import { LogAuditoriaServiceMinhaAtividade } from '../service/log-auditoria.service.minha-atividade';

@Controller('log-auditoria')
export class LogAuditoriaControllerMinhaAtividade {
  constructor(private readonly service: LogAuditoriaServiceMinhaAtividade) {}

  @Get('minha-atividade')
  @UseGuards(RequireAuthGuard)
  minhaAtividade(@Req() request: Request) {
    // request.user sempre definido aqui - RequireAuthGuard já garantiu.
    return this.service.executar(request.user!.idUsuario);
  }
}
