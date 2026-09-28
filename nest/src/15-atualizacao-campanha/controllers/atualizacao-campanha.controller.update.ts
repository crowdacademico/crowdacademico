import { Body, Controller, Param, ParseIntPipe, Patch } from '@nestjs/common';
import { AtualizacaoCampanhaRequestUpdate } from '../dto/request/atualizacao-campanha.request-update';
import { AtualizacaoCampanhaServiceUpdate } from '../service/atualizacao-campanha.service.update';

@Controller('atualizacao-campanha')
export class AtualizacaoCampanhaControllerUpdate {
  constructor(private readonly service: AtualizacaoCampanhaServiceUpdate) {}

  @Patch(':id')
  atualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AtualizacaoCampanhaRequestUpdate,
  ) {
    return this.service.executar(id, dto);
  }
}
