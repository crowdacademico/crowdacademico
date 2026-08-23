import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { RequireAuthGuard } from '../../3-auth/guards/require-auth.guard';
import { ComentarioRequestCreate } from '../dto/request/comentario.request-create';
import { ComentarioServiceCreate } from '../service/comentario.service.create';

@Controller('comentario')
export class ComentarioControllerCreate {
  constructor(private readonly service: ComentarioServiceCreate) {}

  @Post()
  @UseGuards(RequireAuthGuard)
  criar(@Body() dto: ComentarioRequestCreate, @Req() request: Request) {
    return this.service.executar(dto, request.user!.idUsuario);
  }
}
