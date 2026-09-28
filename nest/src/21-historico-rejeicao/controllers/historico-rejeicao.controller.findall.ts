import { Controller, Get, ParseIntPipe, Query } from '@nestjs/common';
import { HistoricoRejeicaoServiceFindAll } from '../service/historico-rejeicao.service.findall';

// Exige login (guarda global, não é @Publico()): pol_historicorej_select (04) só mostra as linhas a quem tem
// campanha_rejeitar ou relatorio_visualizar, ou ao dono da campanha. Sem login a lista vinha sempre vazia.
@Controller('historico-rejeicao')
export class HistoricoRejeicaoControllerFindAll {
  constructor(private readonly service: HistoricoRejeicaoServiceFindAll) {}

  @Get()
  listar(@Query('idCampanha', ParseIntPipe) idCampanha: number) {
    return this.service.executar(idCampanha);
  }
}
