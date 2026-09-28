import { Body, Controller, Post } from '@nestjs/common';
import { ArquivoAtualizacaoRequestCreate } from '../dto/request/arquivo-atualizacao.request-create';
import { ArquivoAtualizacaoServiceCreate } from '../service/arquivo-atualizacao.service.create';

@Controller('arquivo-atualizacao')
export class ArquivoAtualizacaoControllerCreate {
  constructor(private readonly service: ArquivoAtualizacaoServiceCreate) {}

  @Post()
  criar(@Body() dto: ArquivoAtualizacaoRequestCreate) {
    return this.service.executar(dto);
  }
}
