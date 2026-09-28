import { Body, Controller, Param, ParseIntPipe, Patch } from '@nestjs/common';
import { CampanhaRequestUpdate } from '../dto/request/campanha.request-update';
import { CampanhaServiceUpdate } from '../service/campanha.service.update';

@Controller('campanha')
export class CampanhaControllerUpdate {
  constructor(private readonly service: CampanhaServiceUpdate) {}

  @Patch(':id')
  atualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CampanhaRequestUpdate,
  ) {
    return this.service.executar(id, dto);
  }
}
