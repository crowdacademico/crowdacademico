import { Controller, Get } from '@nestjs/common';
import { LogAuditoriaServiceMyActivity } from '../service/log-auditoria.service.my-activity';
import { UsuarioAtual } from '../../commons/auth/usuario-atual.decorator';
import type { UsuarioAutenticado } from '../../commons/auth/usuario-autenticado.interface';

@Controller('log-auditoria')
export class LogAuditoriaControllerMyActivity {
  constructor(private readonly service: LogAuditoriaServiceMyActivity) {}

  @Get('minha-atividade')
  minhaAtividade(@UsuarioAtual() usuario: UsuarioAutenticado) {
    return this.service.executar(usuario.idUsuario);
  }
}
