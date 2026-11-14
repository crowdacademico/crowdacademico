import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { Publico } from '../../commons/auth/publico.decorator';
import { ContribuicaoResponsePublicCount } from '../dto/response/contribuicao.response-public-count';
import { ContribuicaoServicePublicCount } from '../service/contribuicao.service.public-count';

@Controller('contribuicao')
export class ContribuicaoControllerPublicCount {
  constructor(private readonly service: ContribuicaoServicePublicCount) {}

  @Get('campanha/:idCampanha/apoios')
  @Publico()
  contar(
    @Param('idCampanha', ParseIntPipe) idCampanha: number,
  ): Promise<ContribuicaoResponsePublicCount> {
    return this.service.executar(idCampanha);
  }
}
