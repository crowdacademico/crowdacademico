import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { RequireAuthGuard } from '../../3-auth/guards/require-auth.guard';
import { CampanhaRequestCreate } from '../dto/request/campanha.request-create';
import { CampanhaServiceCreate } from '../service/campanha.service.create';

@Controller('campanha')
export class CampanhaControllerCreate {
  constructor(private readonly service: CampanhaServiceCreate) {}

  @Post()
  @UseGuards(RequireAuthGuard)
  criar(@Body() dto: CampanhaRequestCreate, @Req() request: Request) {
    return this.service.executar(dto, request.user!.idUsuario);
  }
}
