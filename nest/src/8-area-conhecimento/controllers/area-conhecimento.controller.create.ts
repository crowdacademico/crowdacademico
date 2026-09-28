import { Body, Controller, Post } from '@nestjs/common';
import { AreaConhecimentoRequestCreate } from '../dto/request/area-conhecimento.request-create';
import { AreaConhecimentoServiceCreate } from '../service/area-conhecimento.service.create';

@Controller('area-conhecimento')
export class AreaConhecimentoControllerCreate {
  constructor(private readonly service: AreaConhecimentoServiceCreate) {}

  @Post()
  criar(@Body() dto: AreaConhecimentoRequestCreate) {
    return this.service.executar(dto);
  }
}
