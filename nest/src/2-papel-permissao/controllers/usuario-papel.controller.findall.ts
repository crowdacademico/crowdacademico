import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { UsuarioPapelServiceFindAll } from '../service/usuario-papel.service.findall';

// SEM RequireAuthGuard — mesmo motivo do findall-geral (ver comentário lá).
// Usado por consultar-usuario.jsx pro textbox de papel.
@Controller('usuario-papel')
export class UsuarioPapelControllerFindAll {
  constructor(private readonly service: UsuarioPapelServiceFindAll) {}

  @Get(':idUsuario')
  listar(@Param('idUsuario', ParseIntPipe) idUsuario: number) {
    return this.service.executar(idUsuario);
  }
}
