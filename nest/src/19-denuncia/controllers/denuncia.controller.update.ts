import { Body, Controller, Param, ParseIntPipe, Patch } from '@nestjs/common';
import { DenunciaRequestUpdate } from '../dto/request/denuncia.request-update';
import { DenunciaServiceUpdate } from '../service/denuncia.service.update';

@Controller('denuncia')
export class DenunciaControllerUpdate {
  constructor(private readonly service: DenunciaServiceUpdate) {}

  @Patch(':id')
  julgar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DenunciaRequestUpdate,
  ) {
    return this.service.executar(id, dto);
  }
}
