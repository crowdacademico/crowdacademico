import { Body, Controller, Param, ParseIntPipe, Patch } from '@nestjs/common';
import { PapelRequestUpdate } from '../dto/request/papel.request-update';
import { PapelServiceUpdate } from '../service/papel.service.update';

@Controller('papel')
export class PapelControllerUpdate {
  constructor(private readonly service: PapelServiceUpdate) {}

  @Patch(':id')
  atualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: PapelRequestUpdate,
  ) {
    return this.service.executar(id, dto);
  }
}
