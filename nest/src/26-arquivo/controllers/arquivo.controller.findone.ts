import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ArquivoServiceFindOne } from '../service/arquivo.service.findone';
import { Publico } from '../../commons/auth/publico.decorator';

@Controller('arquivo')
export class ArquivoControllerFindOne {
  constructor(private readonly service: ArquivoServiceFindOne) {}

  @Get(':id')
  @Publico()
  buscar(@Param('id', ParseIntPipe) id: number) {
    return this.service.executar(id);
  }
}
