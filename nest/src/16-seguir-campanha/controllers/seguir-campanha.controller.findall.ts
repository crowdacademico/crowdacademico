import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { RequireAuthGuard } from '../../3-auth/guards/require-auth.guard';
import { SeguirCampanhaServiceFindAll } from '../service/seguir-campanha.service.findall';

@Controller('seguir-campanha')
export class SeguirCampanhaControllerFindAll {
  constructor(private readonly service: SeguirCampanhaServiceFindAll) {}

  @Get()
  @UseGuards(RequireAuthGuard)
  listar(@Req() request: Request) {
    return this.service.executar(request.user!.idUsuario);
  }
}
