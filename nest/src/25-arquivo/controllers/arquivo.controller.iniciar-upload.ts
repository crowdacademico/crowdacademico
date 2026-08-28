import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { RequireAuthGuard } from '../../3-auth/guards/require-auth.guard';
import { ArquivoRequestIniciarUpload } from '../dto/request/arquivo.request-iniciar-upload';
import { ArquivoServiceIniciarUpload } from '../service/arquivo.service.iniciar-upload';

@Controller('arquivo/upload')
export class ArquivoControllerIniciarUpload {
  constructor(private readonly service: ArquivoServiceIniciarUpload) {}

  @Post('iniciar')
  @UseGuards(RequireAuthGuard)
  iniciar(@Body() dto: ArquivoRequestIniciarUpload) {
    return this.service.executar(dto);
  }
}
