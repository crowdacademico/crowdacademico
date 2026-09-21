import {
  Body,
  Controller,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { RequireAuthGuard } from '../../3-auth/guards/require-auth.guard';
import { CampanhaRequestDeslizarDatas } from '../dto/request/campanha.request-deslizar-datas';
import { CampanhaServiceDeslizarDatas } from '../service/campanha.service.deslizar-datas';

@Controller('campanha')
export class CampanhaControllerDeslizarDatas {
  constructor(private readonly service: CampanhaServiceDeslizarDatas) {}

  @Post(':id/deslizar-datas')
  @UseGuards(RequireAuthGuard)
  deslizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CampanhaRequestDeslizarDatas,
  ) {
    return this.service.executar(id, dto.novaDataInicio);
  }
}
