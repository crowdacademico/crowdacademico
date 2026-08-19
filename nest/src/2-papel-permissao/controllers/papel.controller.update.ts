import {
  Body,
  Controller,
  Param,
  ParseIntPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { RequireAuthGuard } from '../../3-auth/guards/require-auth.guard';
import { PapelRequestUpdate } from '../dto/request/papel.request-update';
import { PapelServiceUpdate } from '../service/papel.service.update';

@Controller('papel')
export class PapelControllerUpdate {
  constructor(private readonly service: PapelServiceUpdate) {}

  @Patch(':id')
  @UseGuards(RequireAuthGuard)
  atualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: PapelRequestUpdate,
  ) {
    return this.service.executar(id, dto);
  }
}
