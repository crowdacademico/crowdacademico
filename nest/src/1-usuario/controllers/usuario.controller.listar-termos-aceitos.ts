import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { UsuarioServiceListarTermosAceitos } from '../service/usuario.service.listar-termos-aceitos';

// GET /usuario/:id/termos-aceitos - não conflita com GET /usuario/:id
// (usuario.controller.findone.ts), mesmo motivo de sempre: Nest casa rota
// por número de segmentos. Sem RequireAuthGuard, mesmo raciocínio de
// usuario.controller.listar-logins.ts.
@Controller('usuario')
export class UsuarioControllerListarTermosAceitos {
  constructor(private readonly service: UsuarioServiceListarTermosAceitos) {}

  @Get(':id/termos-aceitos')
  listar(@Param('id', ParseIntPipe) id: number) {
    return this.service.executar(id);
  }
}
