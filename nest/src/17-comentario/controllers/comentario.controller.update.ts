import { Body, Controller, Param, ParseIntPipe, Patch } from '@nestjs/common';
import { ComentarioRequestUpdate } from '../dto/request/comentario.request-update';
import { ComentarioServiceUpdate } from '../service/comentario.service.update';

@Controller('comentario')
export class ComentarioControllerUpdate {
  constructor(private readonly service: ComentarioServiceUpdate) {}

  @Patch(':id')
  atualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ComentarioRequestUpdate,
  ) {
    return this.service.executar(id, dto);
  }
}
