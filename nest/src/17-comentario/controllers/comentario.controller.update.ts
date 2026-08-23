import {
  Body,
  Controller,
  Param,
  ParseIntPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { RequireAuthGuard } from '../../3-auth/guards/require-auth.guard';
import { ComentarioRequestUpdate } from '../dto/request/comentario.request-update';
import { ComentarioServiceUpdate } from '../service/comentario.service.update';

@Controller('comentario')
export class ComentarioControllerUpdate {
  constructor(private readonly service: ComentarioServiceUpdate) {}

  @Patch(':id')
  @UseGuards(RequireAuthGuard)
  atualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ComentarioRequestUpdate,
  ) {
    return this.service.executar(id, dto);
  }
}
