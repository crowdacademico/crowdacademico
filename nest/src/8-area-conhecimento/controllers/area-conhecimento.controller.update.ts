import {
  Body,
  Controller,
  Param,
  ParseIntPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { RequireAuthGuard } from '../../3-auth/guards/require-auth.guard';
import { AreaConhecimentoRequestUpdate } from '../dto/request/area-conhecimento.request-update';
import { AreaConhecimentoServiceUpdate } from '../service/area-conhecimento.service.update';

@Controller('area-conhecimento')
export class AreaConhecimentoControllerUpdate {
  constructor(private readonly service: AreaConhecimentoServiceUpdate) {}

  @Patch(':id')
  @UseGuards(RequireAuthGuard)
  atualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AreaConhecimentoRequestUpdate,
  ) {
    return this.service.executar(id, dto);
  }
}
