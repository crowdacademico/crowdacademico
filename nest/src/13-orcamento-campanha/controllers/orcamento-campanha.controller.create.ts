import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { RequireAuthGuard } from '../../3-auth/guards/require-auth.guard';
import { OrcamentoCampanhaRequestCreate } from '../dto/request/orcamento-campanha.request-create';
import { OrcamentoCampanhaServiceCreate } from '../service/orcamento-campanha.service.create';

@Controller('orcamento-campanha')
export class OrcamentoCampanhaControllerCreate {
  constructor(private readonly service: OrcamentoCampanhaServiceCreate) {}

  @Post()
  @UseGuards(RequireAuthGuard)
  criar(@Body() dto: OrcamentoCampanhaRequestCreate) {
    return this.service.executar(dto);
  }
}
