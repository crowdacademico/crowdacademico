import { Body, Controller, Param, ParseIntPipe, Patch } from '@nestjs/common';
import { TipoLinkRequestUpdate } from '../dto/request/tipo-link.request-update';
import { TipoLinkServiceUpdate } from '../service/tipo-link.service.update';

@Controller('tipo-link')
export class TipoLinkControllerUpdate {
  constructor(private readonly service: TipoLinkServiceUpdate) {}

  @Patch(':id')
  atualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: TipoLinkRequestUpdate,
  ) {
    return this.service.executar(id, dto);
  }
}
