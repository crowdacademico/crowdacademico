import { Body, Controller, Param, ParseIntPipe, Patch } from '@nestjs/common';
import { LinkAtualizacaoRequestUpdate } from '../dto/request/link-atualizacao.request-update';
import { LinkAtualizacaoServiceUpdate } from '../service/link-atualizacao.service.update';

@Controller('link-atualizacao')
export class LinkAtualizacaoControllerUpdate {
  constructor(private readonly service: LinkAtualizacaoServiceUpdate) {}

  @Patch(':id')
  atualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: LinkAtualizacaoRequestUpdate,
  ) {
    return this.service.executar(id, dto);
  }
}
