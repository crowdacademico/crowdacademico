import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { UsuarioServiceListarLogins } from '../service/usuario.service.listar-logins';

// GET /usuario/:id/logins - não conflita com GET /usuario/:id
// (usuario.controller.findone.ts) pelo mesmo motivo de sempre: Nest casa
// rota por número de segmentos.
//
// Sem RequireAuthGuard, mesmo raciocínio de usuario-papel.controller.
// findall-geral.ts (07-08-2026): este painel admin só é alcançado por
// admin em qualquer versão futura do sistema.
@Controller('usuario')
export class UsuarioControllerListarLogins {
  constructor(private readonly service: UsuarioServiceListarLogins) {}

  @Get(':id/logins')
  listar(@Param('id', ParseIntPipe) id: number) {
    return this.service.executar(id);
  }
}
