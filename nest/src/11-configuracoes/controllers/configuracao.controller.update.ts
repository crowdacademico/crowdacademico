import {
  Body,
  Controller,
  Param,
  ParseIntPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { RequireAuthGuard } from '../../3-auth/guards/require-auth.guard';
import { ConfiguracaoRequestUpdate } from '../dto/request/configuracao.request-update';
import { ConfiguracaoServiceUpdate } from '../service/configuracao.service.update';

@Controller('configuracoes')
export class ConfiguracaoControllerUpdate {
  constructor(private readonly service: ConfiguracaoServiceUpdate) {}

  @Patch(':id')
  @UseGuards(RequireAuthGuard)
  atualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ConfiguracaoRequestUpdate,
  ) {
    return this.service.executar(id, dto);
  }
}
