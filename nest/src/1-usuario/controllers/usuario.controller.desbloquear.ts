import {
  Controller,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { UsuarioServiceDesbloquear } from '../service/usuario.service.desbloquear';

@Controller('usuario')
export class UsuarioControllerDesbloquear {
  constructor(private readonly service: UsuarioServiceDesbloquear) {}

  @Post(':id/desbloquear')
  @HttpCode(204)
  desbloquear(@Param('id', ParseIntPipe) id: number) {
    return this.service.executar(id);
  }
}
