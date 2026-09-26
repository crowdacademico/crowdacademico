import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { RequireAuthGuard } from '../../3-auth/guards/require-auth.guard';
import { UsuarioServiceListarTermosAceitos } from '../service/usuario.service.listar-termos-aceitos';

// GET /usuario/:id/termos-aceitos - não conflita com GET /usuario/:id
// (usuario.controller.findone.ts), mesmo motivo de sempre: Nest casa rota
// por número de segmentos. Exige login, mesmo motivo de
// usuario.controller.listar-logins.ts (a RLS de usuario_termo já limita as linhas ao próprio ou a quem tem permissão).
@Controller('usuario')
@UseGuards(RequireAuthGuard)
export class UsuarioControllerListarTermosAceitos {
  constructor(private readonly service: UsuarioServiceListarTermosAceitos) {}

  @Get(':id/termos-aceitos')
  listar(@Param('id', ParseIntPipe) id: number) {
    return this.service.executar(id);
  }
}
