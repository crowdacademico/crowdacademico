import { Body, Controller, Param, ParseIntPipe, Patch } from '@nestjs/common';
import { LinkAcademicoRequestUpdate } from '../dto/request/link-academico.request-update';
import { LinkAcademicoServiceUpdate } from '../service/link-academico.service.update';

@Controller('link-academico')
export class LinkAcademicoControllerUpdate {
  constructor(private readonly service: LinkAcademicoServiceUpdate) {}

  @Patch(':id')
  atualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: LinkAcademicoRequestUpdate,
  ) {
    return this.service.executar(id, dto);
  }
}
