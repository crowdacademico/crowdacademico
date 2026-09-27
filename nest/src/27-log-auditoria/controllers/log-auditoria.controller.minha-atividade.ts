import { Controller, Get, UseGuards } from '@nestjs/common';
import { RequireAuthGuard } from '../../3-auth/guards/require-auth.guard';
import { LogAuditoriaServiceMinhaAtividade } from '../service/log-auditoria.service.minha-atividade';
import { UsuarioAtual } from '../../commons/auth/usuario-atual.decorator';
import type { UsuarioAutenticado } from '../../commons/auth/usuario-autenticado.interface';

@Controller('log-auditoria')
export class LogAuditoriaControllerMinhaAtividade {
  constructor(private readonly service: LogAuditoriaServiceMinhaAtividade) {}

  @Get('minha-atividade')
  @UseGuards(RequireAuthGuard)
  minhaAtividade(@UsuarioAtual() usuario: UsuarioAutenticado) {
    return this.service.executar(usuario.idUsuario);
  }
}
