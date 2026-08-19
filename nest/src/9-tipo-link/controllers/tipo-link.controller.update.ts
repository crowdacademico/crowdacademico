import {
  Body,
  Controller,
  Param,
  ParseIntPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { RequireAuthGuard } from '../../3-auth/guards/require-auth.guard';
import { TipoLinkRequestUpdate } from '../dto/request/tipo-link.request-update';
import { TipoLinkServiceUpdate } from '../service/tipo-link.service.update';

@Controller('tipo-link')
export class TipoLinkControllerUpdate {
  constructor(private readonly service: TipoLinkServiceUpdate) {}

  @Patch(':id')
  @UseGuards(RequireAuthGuard)
  atualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: TipoLinkRequestUpdate,
  ) {
    return this.service.executar(id, dto);
  }
}
