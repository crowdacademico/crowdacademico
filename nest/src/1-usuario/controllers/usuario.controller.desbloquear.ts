import {
  Controller,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { RequireAuthGuard } from '../../3-auth/guards/require-auth.guard';
import { UsuarioServiceDesbloquear } from '../service/usuario.service.desbloquear';

@Controller('usuario')
export class UsuarioControllerDesbloquear {
  constructor(private readonly service: UsuarioServiceDesbloquear) {}

  @Post(':id/desbloquear')
  @HttpCode(204)
  @UseGuards(RequireAuthGuard)
  desbloquear(@Param('id', ParseIntPipe) id: number) {
    return this.service.executar(id);
  }
}
