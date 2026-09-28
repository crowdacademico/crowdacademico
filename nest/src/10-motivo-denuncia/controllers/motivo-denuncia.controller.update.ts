import { Body, Controller, Param, ParseIntPipe, Patch } from '@nestjs/common';
import { MotivoDenunciaRequestUpdate } from '../dto/request/motivo-denuncia.request-update';
import { MotivoDenunciaServiceUpdate } from '../service/motivo-denuncia.service.update';

@Controller('motivo-denuncia')
export class MotivoDenunciaControllerUpdate {
  constructor(private readonly service: MotivoDenunciaServiceUpdate) {}

  @Patch(':id')
  atualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: MotivoDenunciaRequestUpdate,
  ) {
    return this.service.executar(id, dto);
  }
}
