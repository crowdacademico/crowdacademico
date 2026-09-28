import { Body, Controller, Param, ParseIntPipe, Patch } from '@nestjs/common';
import { AreaConhecimentoRequestUpdate } from '../dto/request/area-conhecimento.request-update';
import { AreaConhecimentoServiceUpdate } from '../service/area-conhecimento.service.update';

@Controller('area-conhecimento')
export class AreaConhecimentoControllerUpdate {
  constructor(private readonly service: AreaConhecimentoServiceUpdate) {}

  @Patch(':id')
  atualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AreaConhecimentoRequestUpdate,
  ) {
    return this.service.executar(id, dto);
  }
}
