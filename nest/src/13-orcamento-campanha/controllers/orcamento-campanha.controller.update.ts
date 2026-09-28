import { Body, Controller, Param, ParseIntPipe, Patch } from '@nestjs/common';
import { OrcamentoCampanhaRequestUpdate } from '../dto/request/orcamento-campanha.request-update';
import { OrcamentoCampanhaServiceUpdate } from '../service/orcamento-campanha.service.update';

@Controller('orcamento-campanha')
export class OrcamentoCampanhaControllerUpdate {
  constructor(private readonly service: OrcamentoCampanhaServiceUpdate) {}

  @Patch(':id')
  atualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: OrcamentoCampanhaRequestUpdate,
  ) {
    return this.service.executar(id, dto);
  }
}
