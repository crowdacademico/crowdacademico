import { Body, Controller, Param, ParseIntPipe, Post } from '@nestjs/common';
import { CampanhaRequestShiftDates } from '../dto/request/campanha.request-shift-dates';
import { CampanhaServiceShiftDates } from '../service/campanha.service.shift-dates';

@Controller('campanha')
export class CampanhaControllerShiftDates {
  constructor(private readonly service: CampanhaServiceShiftDates) {}

  @Post(':id/deslizar-datas')
  deslizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CampanhaRequestShiftDates,
  ) {
    return this.service.executar(id, dto.novaDataInicio);
  }
}
