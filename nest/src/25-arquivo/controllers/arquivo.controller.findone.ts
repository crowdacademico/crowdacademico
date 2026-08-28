import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ArquivoServiceFindOne } from '../service/arquivo.service.findone';

@Controller('arquivo')
export class ArquivoControllerFindOne {
  constructor(private readonly service: ArquivoServiceFindOne) {}

  @Get(':id')
  buscar(@Param('id', ParseIntPipe) id: number) {
    return this.service.executar(id);
  }
}
