import {
  Body,
  Controller,
  Param,
  ParseIntPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { RequireAuthGuard } from '../../3-auth/guards/require-auth.guard';
import { LinkAcademicoRequestUpdate } from '../dto/request/link-academico.request-update';
import { LinkAcademicoServiceUpdate } from '../service/link-academico.service.update';

@Controller('link-academico')
export class LinkAcademicoControllerUpdate {
  constructor(private readonly service: LinkAcademicoServiceUpdate) {}

  @Patch(':id')
  @UseGuards(RequireAuthGuard)
  atualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: LinkAcademicoRequestUpdate,
  ) {
    return this.service.executar(id, dto);
  }
}
