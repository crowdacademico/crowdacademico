import { Controller, Get, ParseIntPipe, Query } from '@nestjs/common';
import { LinkAtualizacaoServiceFindAll } from '../service/link-atualizacao.service.findall';

@Controller('link-atualizacao')
export class LinkAtualizacaoControllerFindAll {
  constructor(private readonly service: LinkAtualizacaoServiceFindAll) {}

  @Get()
  listar(@Query('idAtualizacao', ParseIntPipe) idAtualizacao: number) {
    return this.service.executar(idAtualizacao);
  }
}
