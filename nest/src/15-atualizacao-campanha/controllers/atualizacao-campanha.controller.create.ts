import { Body, Controller, Post } from '@nestjs/common';
import { AtualizacaoCampanhaRequestCreate } from '../dto/request/atualizacao-campanha.request-create';
import { AtualizacaoCampanhaServiceCreate } from '../service/atualizacao-campanha.service.create';

@Controller('atualizacao-campanha')
export class AtualizacaoCampanhaControllerCreate {
  constructor(private readonly service: AtualizacaoCampanhaServiceCreate) {}

  @Post()
  criar(@Body() dto: AtualizacaoCampanhaRequestCreate) {
    return this.service.executar(dto);
  }
}
