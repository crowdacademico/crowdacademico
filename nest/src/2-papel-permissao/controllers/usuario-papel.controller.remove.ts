import {
  Controller,
  Delete,
  HttpCode,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { UsuarioPapelServiceRemove } from '../service/usuario-papel.service.remove';

@Controller('usuario-papel')
export class UsuarioPapelControllerRemove {
  constructor(private readonly service: UsuarioPapelServiceRemove) {}

  @Delete(':idUsuario/:idPapel')
  @HttpCode(204)
  remover(
    @Param('idUsuario', ParseIntPipe) idUsuario: number,
    @Param('idPapel', ParseIntPipe) idPapel: number,
  ) {
    return this.service.executar(idUsuario, idPapel);
  }
}
