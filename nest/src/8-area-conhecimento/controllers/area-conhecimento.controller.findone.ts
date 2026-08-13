import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { AreaConhecimentoServiceFindOne } from '../service/area-conhecimento.service.findone';

@Controller('area-conhecimento')
export class AreaConhecimentoControllerFindOne {
  constructor(private readonly service: AreaConhecimentoServiceFindOne) {}

  @Get(':id')
  buscar(@Param('id', ParseIntPipe) id: number) {
    return this.service.executar(id);
  }
}
