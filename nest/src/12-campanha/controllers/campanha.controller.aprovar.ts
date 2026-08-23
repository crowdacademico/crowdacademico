import {
  Controller,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { RequireAuthGuard } from '../../3-auth/guards/require-auth.guard';
import { CampanhaServiceAprovar } from '../service/campanha.service.aprovar';

@Controller('campanha')
export class CampanhaControllerAprovar {
  constructor(private readonly service: CampanhaServiceAprovar) {}

  @Post(':id/aprovar')
  @UseGuards(RequireAuthGuard)
  aprovar(@Param('id', ParseIntPipe) id: number, @Req() request: Request) {
    return this.service.executar(id, request.user!.idUsuario);
  }
}
