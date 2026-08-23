import { Controller, Get, ParseIntPipe, Query } from '@nestjs/common';
import { MarcoCronogramaServiceFindAll } from '../service/marco-cronograma.service.findall';

// Sem @UseGuards — mesma visibilidade pública condicional de
// orcamento-campanha (pol_marco_cronograma_select, 04).
@Controller('marco-cronograma')
export class MarcoCronogramaControllerFindAll {
  constructor(private readonly service: MarcoCronogramaServiceFindAll) {}

  @Get()
  listar(@Query('idCampanha', ParseIntPipe) idCampanha: number) {
    return this.service.executar(idCampanha);
  }
}
