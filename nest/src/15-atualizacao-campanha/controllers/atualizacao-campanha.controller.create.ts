import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { RequireAuthGuard } from '../../3-auth/guards/require-auth.guard';
import { AtualizacaoCampanhaRequestCreate } from '../dto/request/atualizacao-campanha.request-create';
import { AtualizacaoCampanhaServiceCreate } from '../service/atualizacao-campanha.service.create';

@Controller('atualizacao-campanha')
export class AtualizacaoCampanhaControllerCreate {
  constructor(private readonly service: AtualizacaoCampanhaServiceCreate) {}

  @Post()
  @UseGuards(RequireAuthGuard)
  criar(@Body() dto: AtualizacaoCampanhaRequestCreate) {
    return this.service.executar(dto);
  }
}
