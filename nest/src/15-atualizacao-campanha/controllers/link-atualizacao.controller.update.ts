import {
  Body,
  Controller,
  Param,
  ParseIntPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { RequireAuthGuard } from '../../3-auth/guards/require-auth.guard';
import { LinkAtualizacaoRequestUpdate } from '../dto/request/link-atualizacao.request-update';
import { LinkAtualizacaoServiceUpdate } from '../service/link-atualizacao.service.update';

@Controller('link-atualizacao')
export class LinkAtualizacaoControllerUpdate {
  constructor(private readonly service: LinkAtualizacaoServiceUpdate) {}

  @Patch(':id')
  @UseGuards(RequireAuthGuard)
  atualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: LinkAtualizacaoRequestUpdate,
  ) {
    return this.service.executar(id, dto);
  }
}
