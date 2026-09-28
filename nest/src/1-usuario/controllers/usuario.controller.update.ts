import { Body, Controller, Param, ParseIntPipe, Patch } from '@nestjs/common';
import { UsuarioRequestUpdate } from '../dto/request/usuario.request-update';
import { UsuarioServiceUpdate } from '../service/usuario.service.update';

@Controller('usuario')
export class UsuarioControllerUpdate {
  constructor(private readonly service: UsuarioServiceUpdate) {}

  @Patch(':id')
  atualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UsuarioRequestUpdate,
  ) {
    return this.service.executar(id, dto);
  }
}
