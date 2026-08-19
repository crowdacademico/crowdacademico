import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { RequireAuthGuard } from '../../3-auth/guards/require-auth.guard';
import { AreaConhecimentoRequestCreate } from '../dto/request/area-conhecimento.request-create';
import { AreaConhecimentoServiceCreate } from '../service/area-conhecimento.service.create';

@Controller('area-conhecimento')
export class AreaConhecimentoControllerCreate {
  constructor(private readonly service: AreaConhecimentoServiceCreate) {}

  @Post()
  @UseGuards(RequireAuthGuard)
  criar(@Body() dto: AreaConhecimentoRequestCreate) {
    return this.service.executar(dto);
  }
}
