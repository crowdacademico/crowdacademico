import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { UsuarioServiceFindAllLogins } from '../service/usuario.service.findall-logins';

// GET /usuario/:id/logins não conflita com GET /usuario/:id (usuario.controller.findone.ts): o Nest casa rota
// por número de segmentos.
//
// Exige login e, no service, ser o próprio usuário ou ter usuario_visualizar_sensivel.
@Controller('usuario')
export class UsuarioControllerFindAllLogins {
  constructor(private readonly service: UsuarioServiceFindAllLogins) {}

  @Get(':id/logins')
  listar(@Param('id', ParseIntPipe) id: number) {
    return this.service.executar(id);
  }
}
