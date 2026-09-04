import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { RequireAuthGuard } from '../../3-auth/guards/require-auth.guard';
import { PerfilPesquisadorRequestCreate } from '../dto/request/perfil-pesquisador.request-create';
import { PerfilPesquisadorServiceCreate } from '../service/perfil-pesquisador.service.create';

// "Tornar-se pesquisador" - sempre a própria conta logada, nunca em nome de
// outra pessoa (mesmo padrão de ConfiguracaoControllerCreate).
@Controller('perfil-pesquisador')
export class PerfilPesquisadorControllerCreate {
  constructor(private readonly service: PerfilPesquisadorServiceCreate) {}

  @Post()
  @UseGuards(RequireAuthGuard)
  criar(@Body() dto: PerfilPesquisadorRequestCreate, @Req() request: Request) {
    return this.service.executar(dto, request.user!.idUsuario);
  }
}
