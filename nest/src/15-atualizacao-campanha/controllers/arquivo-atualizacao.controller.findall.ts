import { Controller, Get, ParseIntPipe, Query } from '@nestjs/common';
import { ArquivoAtualizacaoServiceFindAll } from '../service/arquivo-atualizacao.service.findall';

@Controller('arquivo-atualizacao')
export class ArquivoAtualizacaoControllerFindAll {
  constructor(private readonly service: ArquivoAtualizacaoServiceFindAll) {}

  @Get()
  listar(@Query('idAtualizacao', ParseIntPipe) idAtualizacao: number) {
    return this.service.executar(idAtualizacao);
  }
}
