import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { UsuarioServiceFindOne } from '../service/usuario.service.findone';

@Controller('usuario')
export class UsuarioControllerFindOne {
  constructor(private readonly service: UsuarioServiceFindOne) {}

  @Get(':id')
  buscar(@Param('id', ParseIntPipe) id: number) {
    return this.service.executar(id);
  }
}
