import { Controller, Get, ParseIntPipe, Query } from '@nestjs/common';
import { LinkAtualizacaoServiceFindAll } from '../service/link-atualizacao.service.findall';
import { Publico } from '../../commons/auth/publico.decorator';

@Controller('link-atualizacao')
export class LinkAtualizacaoControllerFindAll {
  constructor(private readonly service: LinkAtualizacaoServiceFindAll) {}

  @Get()
  @Publico()
  listar(@Query('idAtualizacao', ParseIntPipe) idAtualizacao: number) {
    return this.service.executar(idAtualizacao);
  }
}
