import { Body, Controller, Param, ParseIntPipe, Patch } from '@nestjs/common';
import { ConfiguracaoRequestUpdate } from '../dto/request/configuracao.request-update';
import { ConfiguracaoServiceUpdate } from '../service/configuracao.service.update';

@Controller('configuracoes')
export class ConfiguracaoControllerUpdate {
  constructor(private readonly service: ConfiguracaoServiceUpdate) {}

  @Patch(':id')
  atualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ConfiguracaoRequestUpdate,
  ) {
    return this.service.executar(id, dto);
  }
}
