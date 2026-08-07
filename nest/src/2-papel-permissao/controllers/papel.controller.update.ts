import {
  Body,
  Controller,
  Param,
  ParseIntPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { RequireAuthGuard } from '../../3-auth/guards/require-auth.guard';
import { AtualizarPapelRequestDto } from '../dto/request/atualizar-papel.request.dto';
import { PapelServiceUpdate } from '../service/papel.service.update';

@Controller('papel')
export class PapelControllerUpdate {
  constructor(private readonly service: PapelServiceUpdate) {}

  @Patch(':id')
  @UseGuards(RequireAuthGuard)
  atualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AtualizarPapelRequestDto,
  ) {
    return this.service.executar(id, dto);
  }
}
