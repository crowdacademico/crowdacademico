import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { RequireAuthGuard } from '../guards/require-auth.guard';
import { AuthServiceEncerrarSessao } from '../service/auth.service.encerrar-sessao';
import { AuthServiceListarSessoes } from '../service/auth.service.listar-sessoes';

@Controller('auth/sessoes')
@UseGuards(RequireAuthGuard)
export class AuthControllerSessoes {
  constructor(
    private readonly listarSessoes: AuthServiceListarSessoes,
    private readonly encerrarSessao: AuthServiceEncerrarSessao,
  ) {}

  @Get()
  listar(@Req() request: Request) {
    return this.listarSessoes.executar(
      request.user!.idUsuario,
      request.user!.idSessao,
    );
  }

  // Sem :id - "encerrar todas as outras" (nunca a própria, sempre por
  // exclusão de idSessao, ver auth.service.encerrar-sessao.ts).
  @Delete()
  @HttpCode(200)
  encerrarTodasMenosAtual(@Req() request: Request) {
    return this.encerrarSessao
      .executarTodasMenosAtual(request.user!.idUsuario, request.user!.idSessao)
      .then((quantidade) => ({ encerradas: quantidade }));
  }

  @Delete(':id')
  @HttpCode(204)
  encerrarUma(@Param('id', ParseIntPipe) id: number, @Req() request: Request) {
    return this.encerrarSessao.executarUma(request.user!.idUsuario, id);
  }
}
