import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { RequireAuthGuard } from '../../3-auth/guards/require-auth.guard';
import { ComentarioRequestCreate } from '../dto/request/comentario.request-create';
import { ComentarioServiceCreate } from '../service/comentario.service.create';
import { UsuarioAtual } from '../../commons/auth/usuario-atual.decorator';
import type { UsuarioAutenticado } from '../../commons/auth/usuario-autenticado.interface';

@Controller('comentario')
export class ComentarioControllerCreate {
  constructor(private readonly service: ComentarioServiceCreate) {}

  @Post()
  @UseGuards(RequireAuthGuard)
  criar(
    @Body() dto: ComentarioRequestCreate,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.service.executar(dto, usuario.idUsuario);
  }
}
