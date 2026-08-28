import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { RequireAuthGuard } from '../../3-auth/guards/require-auth.guard';
import { ArquivoRequestConfirmarUpload } from '../dto/request/arquivo.request-confirmar-upload';
import { ArquivoServiceConfirmarUpload } from '../service/arquivo.service.confirmar-upload';

@Controller('arquivo/upload')
export class ArquivoControllerConfirmarUpload {
  constructor(private readonly service: ArquivoServiceConfirmarUpload) {}

  @Post('confirmar')
  @UseGuards(RequireAuthGuard)
  confirmar(
    @Body() dto: ArquivoRequestConfirmarUpload,
    @Req() request: Request,
  ) {
    return this.service.executar(dto, request.user!.idUsuario);
  }
}
