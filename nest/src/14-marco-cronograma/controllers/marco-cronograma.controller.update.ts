import { Body, Controller, Param, ParseIntPipe, Patch } from '@nestjs/common';
import { MarcoCronogramaRequestUpdate } from '../dto/request/marco-cronograma.request-update';
import { MarcoCronogramaServiceUpdate } from '../service/marco-cronograma.service.update';

@Controller('marco-cronograma')
export class MarcoCronogramaControllerUpdate {
  constructor(private readonly service: MarcoCronogramaServiceUpdate) {}

  @Patch(':id')
  atualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: MarcoCronogramaRequestUpdate,
  ) {
    return this.service.executar(id, dto);
  }
}
