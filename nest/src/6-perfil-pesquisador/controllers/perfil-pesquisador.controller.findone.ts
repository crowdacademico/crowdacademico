import { Controller, Get, Param, ParseIntPipe, Req } from '@nestjs/common';
import type { Request } from 'express';
import { PerfilPesquisadorServiceFindOne } from '../service/perfil-pesquisador.service.findone';
import { PerfilPesquisadorServiceFindOneScore } from '../service/perfil-pesquisador.service.findone-score';

// Sem @UseGuards — perfil de pesquisador é público de propósito (aparece na
// página de campanha/perfil pra qualquer visitante). JwtAuthGuard é GLOBAL
// (auth.module.ts) e já resolve request.user quando existe um Bearer token
// válido, mesmo sem nenhum guard de rota aqui — é assim que o service
// consegue saber "é o próprio dono vendo o CPF" sem exigir login pra ver o
// resto do perfil.
@Controller('perfil-pesquisador')
export class PerfilPesquisadorControllerFindOne {
  constructor(
    private readonly service: PerfilPesquisadorServiceFindOne,
    private readonly serviceScore: PerfilPesquisadorServiceFindOneScore,
  ) {}

  @Get(':id')
  buscar(@Param('id', ParseIntPipe) id: number, @Req() request: Request) {
    return this.service.executar(id, request.user?.idUsuario ?? null);
  }

  @Get(':id/score')
  buscarScore(@Param('id', ParseIntPipe) id: number) {
    return this.serviceScore.executar(id);
  }
}
