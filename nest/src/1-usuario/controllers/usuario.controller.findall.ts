import { Controller, Get } from '@nestjs/common';
import { UsuarioServiceFindAll } from '../service/usuario.service.findall';

@Controller('usuario')
export class UsuarioControllerFindAll {
  constructor(private readonly service: UsuarioServiceFindAll) {}

  @Get()
  listar() {
    return this.service.executar();
  }
}
