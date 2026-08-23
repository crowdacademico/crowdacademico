import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { RequireAuthGuard } from '../../3-auth/guards/require-auth.guard';
import { SeguirCampanhaRequestCreate } from '../dto/request/seguir-campanha.request-create';
import { SeguirCampanhaServiceCreate } from '../service/seguir-campanha.service.create';

@Controller('seguir-campanha')
export class SeguirCampanhaControllerCreate {
  constructor(private readonly service: SeguirCampanhaServiceCreate) {}

  @Post()
  @UseGuards(RequireAuthGuard)
  criar(@Body() dto: SeguirCampanhaRequestCreate, @Req() request: Request) {
    return this.service.executar(dto, request.user!.idUsuario);
  }
}
