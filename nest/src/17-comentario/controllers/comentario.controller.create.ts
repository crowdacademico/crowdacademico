import { Body, Controller, Post } from '@nestjs/common';
import { ComentarioRequestCreate } from '../dto/request/comentario.request-create';
import { ComentarioServiceCreate } from '../service/comentario.service.create';
import { UsuarioAtual } from '../../commons/auth/usuario-atual.decorator';
import type { UsuarioAutenticado } from '../../commons/auth/usuario-autenticado.interface';

@Controller('comentario')
export class ComentarioControllerCreate {
  constructor(private readonly service: ComentarioServiceCreate) {}

  @Post()
  criar(
    @Body() dto: ComentarioRequestCreate,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.service.executar(dto, usuario.idUsuario);
  }
}
