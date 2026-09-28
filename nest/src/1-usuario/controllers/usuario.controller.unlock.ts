import {
  Controller,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { UsuarioServiceUnlock } from '../service/usuario.service.unlock';

@Controller('usuario')
export class UsuarioControllerUnlock {
  constructor(private readonly service: UsuarioServiceUnlock) {}

  @Post(':id/desbloquear')
  @HttpCode(204)
  desbloquear(@Param('id', ParseIntPipe) id: number) {
    return this.service.executar(id);
  }
}
