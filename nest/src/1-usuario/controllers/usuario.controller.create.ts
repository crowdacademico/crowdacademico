import { Body, Controller, Post } from '@nestjs/common';
import { UsuarioRequestCreate } from '../dto/request/usuario.request-create';
import { UsuarioServiceCreate } from '../service/usuario.service.create';

@Controller('usuario')
export class UsuarioControllerCreate {
  constructor(private readonly service: UsuarioServiceCreate) {}

  @Post()
  criar(@Body() dto: UsuarioRequestCreate) {
    return this.service.executar(dto);
  }
}
