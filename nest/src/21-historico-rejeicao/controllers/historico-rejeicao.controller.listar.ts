import { Controller, Get, ParseIntPipe, Query } from '@nestjs/common';
import { HistoricoRejeicaoServiceListar } from '../service/historico-rejeicao.service.listar';

// Sem @UseGuards - pol_historicorej_select (04) decide sozinha: quem tem
// campanha_rejeitar (admin/moderador) OU é o dono da campanha - mesmo
// padrão de orcamento-campanha.controller.findall.ts.
@Controller('historico-rejeicao')
export class HistoricoRejeicaoControllerListar {
  constructor(private readonly service: HistoricoRejeicaoServiceListar) {}

  @Get()
  listar(@Query('idCampanha', ParseIntPipe) idCampanha: number) {
    return this.service.executar(idCampanha);
  }
}
