import { Body, Controller, Param, ParseIntPipe, Patch } from '@nestjs/common';
import { ConfiguracoesRequestUpdate } from '../dto/request/configuracoes.request-update';
import { ConfiguracoesServiceUpdate } from '../service/configuracoes.service.update';

@Controller('configuracoes')
export class ConfiguracoesControllerUpdate {
  constructor(private readonly service: ConfiguracoesServiceUpdate) {}

  @Patch(':id')
  atualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ConfiguracoesRequestUpdate,
  ) {
    return this.service.executar(id, dto);
  }
}
