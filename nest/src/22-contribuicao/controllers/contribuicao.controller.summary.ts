import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ContribuicaoResponseSummary } from '../dto/response/contribuicao.response-summary';
import { ContribuicaoServiceSummary } from '../service/contribuicao.service.summary';

@Controller('contribuicao')
export class ContribuicaoControllerSummary {
  constructor(private readonly service: ContribuicaoServiceSummary) {}

  // Resumo para o Consultar da campanha (gestão e o próprio pesquisador). Exige login (padrão).
  @Get('campanha/:idCampanha/resumo')
  resumir(
    @Param('idCampanha', ParseIntPipe) idCampanha: number,
  ): Promise<ContribuicaoResponseSummary[]> {
    return this.service.executar(idCampanha);
  }
}
