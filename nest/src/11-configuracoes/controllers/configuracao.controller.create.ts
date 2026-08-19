import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { RequireAuthGuard } from '../../3-auth/guards/require-auth.guard';
import { ConfiguracaoRequestCreate } from '../dto/request/configuracao.request-create';
import { ConfiguracaoServiceCreate } from '../service/configuracao.service.create';

@Controller('configuracoes')
export class ConfiguracaoControllerCreate {
  constructor(private readonly service: ConfiguracaoServiceCreate) {}

  @Post()
  @UseGuards(RequireAuthGuard)
  criar(@Body() dto: ConfiguracaoRequestCreate, @Req() request: Request) {
    // request.user sempre definido aqui — RequireAuthGuard já garantiu.
    return this.service.executar(dto, request.user!.idUsuario);
  }
}
