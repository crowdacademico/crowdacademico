import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { RequireAuthGuard } from '../../3-auth/guards/require-auth.guard';
import { UsuarioPapelRequestCreate } from '../dto/request/usuario-papel.request-create';
import { UsuarioPapelServiceCreate } from '../service/usuario-papel.service.create';

@Controller('usuario-papel')
export class UsuarioPapelControllerCreate {
  constructor(private readonly service: UsuarioPapelServiceCreate) {}

  @Post()
  @UseGuards(RequireAuthGuard)
  atribuir(@Body() dto: UsuarioPapelRequestCreate) {
    return this.service.executar(dto);
  }
}
