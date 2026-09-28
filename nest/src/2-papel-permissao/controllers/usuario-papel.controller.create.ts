import { Body, Controller, Post } from '@nestjs/common';
import { UsuarioPapelRequestCreate } from '../dto/request/usuario-papel.request-create';
import { UsuarioPapelServiceCreate } from '../service/usuario-papel.service.create';

@Controller('usuario-papel')
export class UsuarioPapelControllerCreate {
  constructor(private readonly service: UsuarioPapelServiceCreate) {}

  @Post()
  atribuir(@Body() dto: UsuarioPapelRequestCreate) {
    return this.service.executar(dto);
  }
}
