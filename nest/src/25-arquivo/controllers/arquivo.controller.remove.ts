import {
  Controller,
  Delete,
  HttpCode,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { ArquivoServiceRemove } from '../service/arquivo.service.remove';

@Controller('arquivo')
export class ArquivoControllerRemove {
  constructor(private readonly service: ArquivoServiceRemove) {}

  @Delete(':id')
  @HttpCode(204)
  remover(@Param('id', ParseIntPipe) id: number) {
    return this.service.executar(id);
  }
}
