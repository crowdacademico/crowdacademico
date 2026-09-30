import {
  Controller,
  Delete,
  HttpCode,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { ComentarioServiceRemove } from '../service/comentario.service.remove';

@Controller('comentario')
export class ComentarioControllerRemove {
  constructor(private readonly service: ComentarioServiceRemove) {}

  @Delete(':id')
  @HttpCode(204)
  remover(@Param('id', ParseIntPipe) id: number) {
    return this.service.executar(id);
  }
}
