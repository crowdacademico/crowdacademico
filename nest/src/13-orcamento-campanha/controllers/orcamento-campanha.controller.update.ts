import {
  Body,
  Controller,
  Param,
  ParseIntPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { RequireAuthGuard } from '../../3-auth/guards/require-auth.guard';
import { OrcamentoCampanhaRequestUpdate } from '../dto/request/orcamento-campanha.request-update';
import { OrcamentoCampanhaServiceUpdate } from '../service/orcamento-campanha.service.update';

@Controller('orcamento-campanha')
export class OrcamentoCampanhaControllerUpdate {
  constructor(private readonly service: OrcamentoCampanhaServiceUpdate) {}

  @Patch(':id')
  @UseGuards(RequireAuthGuard)
  atualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: OrcamentoCampanhaRequestUpdate,
  ) {
    return this.service.executar(id, dto);
  }
}
