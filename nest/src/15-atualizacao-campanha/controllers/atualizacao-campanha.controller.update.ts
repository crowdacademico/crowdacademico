import {
  Body,
  Controller,
  Param,
  ParseIntPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { RequireAuthGuard } from '../../3-auth/guards/require-auth.guard';
import { AtualizacaoCampanhaRequestUpdate } from '../dto/request/atualizacao-campanha.request-update';
import { AtualizacaoCampanhaServiceUpdate } from '../service/atualizacao-campanha.service.update';

@Controller('atualizacao-campanha')
export class AtualizacaoCampanhaControllerUpdate {
  constructor(private readonly service: AtualizacaoCampanhaServiceUpdate) {}

  @Patch(':id')
  @UseGuards(RequireAuthGuard)
  atualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AtualizacaoCampanhaRequestUpdate,
  ) {
    return this.service.executar(id, dto);
  }
}
