import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { UsuarioServiceListarLogins } from '../service/usuario.service.listar-logins';

// GET /usuario/:id/logins não conflita com GET /usuario/:id (usuario.controller.findone.ts): o Nest casa rota
// por número de segmentos.
//
// Exige login e, no service, ser o próprio usuário ou ter usuario_visualizar_sensivel.
@Controller('usuario')
export class UsuarioControllerListarLogins {
  constructor(private readonly service: UsuarioServiceListarLogins) {}

  @Get(':id/logins')
  listar(@Param('id', ParseIntPipe) id: number) {
    return this.service.executar(id);
  }
}
