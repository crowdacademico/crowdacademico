import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { PerfilPesquisadorRequestSuspender } from '../dto/request/perfil-pesquisador.request-suspender';
import { PerfilPesquisadorServiceSuspender } from '../service/perfil-pesquisador.service.suspender';

@Controller('perfil-pesquisador')
export class PerfilPesquisadorControllerSuspender {
  constructor(private readonly service: PerfilPesquisadorServiceSuspender) {}

  @Get(':id/suspensao')
  buscar(@Param('id', ParseIntPipe) id: number) {
    return this.service.buscarSuspensao(id);
  }

  @Post(':id/suspender')
  @HttpCode(204)
  suspender(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: PerfilPesquisadorRequestSuspender,
  ) {
    return this.service.executar(id, dto.ate, dto.motivo);
  }
}
