import {
  Controller,
  Delete,
  HttpCode,
  Param,
  ParseIntPipe,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { RequireAuthGuard } from '../../3-auth/guards/require-auth.guard';
import { SeguirCampanhaServiceRemove } from '../service/seguir-campanha.service.remove';

@Controller('seguir-campanha')
export class SeguirCampanhaControllerRemove {
  constructor(private readonly service: SeguirCampanhaServiceRemove) {}

  @Delete(':idCampanha')
  @HttpCode(204)
  @UseGuards(RequireAuthGuard)
  async remover(
    @Param('idCampanha', ParseIntPipe) idCampanha: number,
    @Req() request: Request,
  ) {
    await this.service.executar(idCampanha, request.user!.idUsuario);
  }
}
