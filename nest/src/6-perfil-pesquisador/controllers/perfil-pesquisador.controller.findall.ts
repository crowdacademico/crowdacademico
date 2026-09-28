import { Controller, Get, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { PerfilPesquisadorRequestList } from '../dto/request/perfil-pesquisador.request-list';
import { PerfilPesquisadorServiceFindAll } from '../service/perfil-pesquisador.service.findall';
import { Publico } from '../../commons/auth/publico.decorator';

// Sem @UseGuards - mesmo motivo de PerfilPesquisadorControllerFindOne
// (catálogo de pesquisadores é público). AuthGuardJwt é GLOBAL e já
// popula request.user quando existe Bearer válido, sem exigir login.
@Controller('perfil-pesquisador')
export class PerfilPesquisadorControllerFindAll {
  constructor(private readonly service: PerfilPesquisadorServiceFindAll) {}

  @Get()
  @Publico()
  listar(
    @Query() filtro: PerfilPesquisadorRequestList,
    @Req() request: Request,
  ) {
    return this.service.executar(filtro, request.user?.idUsuario ?? null);
  }
}
