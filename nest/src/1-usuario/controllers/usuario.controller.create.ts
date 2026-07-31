import { Body, Controller, Post } from '@nestjs/common';
import { CriarUsuarioRequestDto } from '../dto/request/criar-usuario.request.dto';
import { UsuarioServiceCreate } from '../service/usuario.service.create';

@Controller('usuario')
export class UsuarioControllerCreate {
  constructor(private readonly service: UsuarioServiceCreate) {}

  @Post()
  criar(@Body() dto: CriarUsuarioRequestDto) {
    return this.service.executar(dto);
  }
}
