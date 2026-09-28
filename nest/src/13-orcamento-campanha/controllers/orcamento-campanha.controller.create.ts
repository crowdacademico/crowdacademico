import { Body, Controller, Post } from '@nestjs/common';
import { OrcamentoCampanhaRequestCreate } from '../dto/request/orcamento-campanha.request-create';
import { OrcamentoCampanhaServiceCreate } from '../service/orcamento-campanha.service.create';

@Controller('orcamento-campanha')
export class OrcamentoCampanhaControllerCreate {
  constructor(private readonly service: OrcamentoCampanhaServiceCreate) {}

  @Post()
  criar(@Body() dto: OrcamentoCampanhaRequestCreate) {
    return this.service.executar(dto);
  }
}
