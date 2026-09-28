import { Body, Controller, Param, ParseIntPipe, Post } from '@nestjs/common';
import { CampanhaRequestDeslizarDatas } from '../dto/request/campanha.request-shift-dates';
import { CampanhaServiceDeslizarDatas } from '../service/campanha.service.shift-dates';

@Controller('campanha')
export class CampanhaControllerDeslizarDatas {
  constructor(private readonly service: CampanhaServiceDeslizarDatas) {}

  @Post(':id/deslizar-datas')
  deslizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CampanhaRequestDeslizarDatas,
  ) {
    return this.service.executar(id, dto.novaDataInicio);
  }
}
