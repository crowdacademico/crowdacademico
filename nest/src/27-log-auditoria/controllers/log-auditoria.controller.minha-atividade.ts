import { Controller, Get } from '@nestjs/common';
import { LogAuditoriaServiceMinhaAtividade } from '../service/log-auditoria.service.minha-atividade';
import { UsuarioAtual } from '../../commons/auth/usuario-atual.decorator';
import type { UsuarioAutenticado } from '../../commons/auth/usuario-autenticado.interface';

@Controller('log-auditoria')
export class LogAuditoriaControllerMinhaAtividade {
  constructor(private readonly service: LogAuditoriaServiceMinhaAtividade) {}

  @Get('minha-atividade')
  minhaAtividade(@UsuarioAtual() usuario: UsuarioAutenticado) {
    return this.service.executar(usuario.idUsuario);
  }
}
