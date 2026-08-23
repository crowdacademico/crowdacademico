import {
  Body,
  Controller,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { RequireAuthGuard } from '../../3-auth/guards/require-auth.guard';
import { CampanhaRequestRejeitar } from '../dto/request/campanha.request-rejeitar';
import { CampanhaServiceRejeitar } from '../service/campanha.service.rejeitar';

@Controller('campanha')
export class CampanhaControllerRejeitar {
  constructor(private readonly service: CampanhaServiceRejeitar) {}

  @Post(':id/rejeitar')
  @UseGuards(RequireAuthGuard)
  rejeitar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CampanhaRequestRejeitar,
    @Req() request: Request,
  ) {
    return this.service.executar(id, request.user!.idUsuario, dto);
  }
}
