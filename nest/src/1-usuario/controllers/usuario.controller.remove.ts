import {
  Controller,
  Delete,
  HttpCode,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { UsuarioServiceRemove } from '../service/usuario.service.remove';

@Controller('usuario')
export class UsuarioControllerRemove {
  constructor(private readonly service: UsuarioServiceRemove) {}

  @Delete(':id')
  @HttpCode(204)
  remover(@Param('id', ParseIntPipe) id: number) {
    return this.service.executar(id);
  }
}
