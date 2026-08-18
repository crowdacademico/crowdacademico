import {
  Body,
  Controller,
  Param,
  ParseIntPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { RequireAuthGuard } from '../../3-auth/guards/require-auth.guard';
import { AtualizarMotivoDenunciaRequestDto } from '../dto/request/atualizar-motivo-denuncia.request.dto';
import { MotivoDenunciaServiceUpdate } from '../service/motivo-denuncia.service.update';

@Controller('motivo-denuncia')
export class MotivoDenunciaControllerUpdate {
  constructor(private readonly service: MotivoDenunciaServiceUpdate) {}

  @Patch(':id')
  @UseGuards(RequireAuthGuard)
  atualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AtualizarMotivoDenunciaRequestDto,
  ) {
    return this.service.executar(id, dto);
  }
}
