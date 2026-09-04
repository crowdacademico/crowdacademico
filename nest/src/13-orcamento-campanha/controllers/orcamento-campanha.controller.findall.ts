import { Controller, Get, ParseIntPipe, Query } from '@nestjs/common';
import { OrcamentoCampanhaServiceFindAll } from '../service/orcamento-campanha.service.findall';

// Sem @UseGuards - pol_orcamento_campanha_select (04) decide sozinha
// (mesma visibilidade de pol_campanha_select: status público, dono, ou
// relatorio_visualizar). Sem sessão nenhuma, uma campanha ainda não
// aprovada simplesmente devolve lista vazia, sem erro.
@Controller('orcamento-campanha')
export class OrcamentoCampanhaControllerFindAll {
  constructor(private readonly service: OrcamentoCampanhaServiceFindAll) {}

  @Get()
  listar(@Query('idCampanha', ParseIntPipe) idCampanha: number) {
    return this.service.executar(idCampanha);
  }
}
