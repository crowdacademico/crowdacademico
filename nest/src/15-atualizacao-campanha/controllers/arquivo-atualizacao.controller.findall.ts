import { Controller, Get, ParseIntPipe, Query } from '@nestjs/common';
import { ArquivoAtualizacaoServiceFindAll } from '../service/arquivo-atualizacao.service.findall';
import { Publico } from '../../commons/auth/publico.decorator';

@Controller('arquivo-atualizacao')
export class ArquivoAtualizacaoControllerFindAll {
  constructor(private readonly service: ArquivoAtualizacaoServiceFindAll) {}

  @Get()
  @Publico()
  listar(@Query('idAtualizacao', ParseIntPipe) idAtualizacao: number) {
    return this.service.executar(idAtualizacao);
  }
}
