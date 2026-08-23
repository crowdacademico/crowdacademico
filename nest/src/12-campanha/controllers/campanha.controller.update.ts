import {
  Body,
  Controller,
  Param,
  ParseIntPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { RequireAuthGuard } from '../../3-auth/guards/require-auth.guard';
import { CampanhaRequestUpdate } from '../dto/request/campanha.request-update';
import { CampanhaServiceUpdate } from '../service/campanha.service.update';

@Controller('campanha')
export class CampanhaControllerUpdate {
  constructor(private readonly service: CampanhaServiceUpdate) {}

  @Patch(':id')
  @UseGuards(RequireAuthGuard)
  atualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CampanhaRequestUpdate,
  ) {
    return this.service.executar(id, dto);
  }
}
