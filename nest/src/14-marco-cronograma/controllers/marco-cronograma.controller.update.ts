import {
  Body,
  Controller,
  Param,
  ParseIntPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { RequireAuthGuard } from '../../3-auth/guards/require-auth.guard';
import { MarcoCronogramaRequestUpdate } from '../dto/request/marco-cronograma.request-update';
import { MarcoCronogramaServiceUpdate } from '../service/marco-cronograma.service.update';

@Controller('marco-cronograma')
export class MarcoCronogramaControllerUpdate {
  constructor(private readonly service: MarcoCronogramaServiceUpdate) {}

  @Patch(':id')
  @UseGuards(RequireAuthGuard)
  atualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: MarcoCronogramaRequestUpdate,
  ) {
    return this.service.executar(id, dto);
  }
}
