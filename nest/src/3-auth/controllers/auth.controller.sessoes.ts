import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { AuthServiceEncerrarSessao } from '../service/auth.service.encerrar-sessao';
import { AuthServiceListarSessoes } from '../service/auth.service.listar-sessoes';
import { UsuarioAtual } from '../../commons/auth/usuario-atual.decorator';
import type { UsuarioAutenticado } from '../../commons/auth/usuario-autenticado.interface';

@Controller('auth/sessoes')
export class AuthControllerSessoes {
  constructor(
    private readonly listarSessoes: AuthServiceListarSessoes,
    private readonly encerrarSessao: AuthServiceEncerrarSessao,
  ) {}

  @Get()
  listar(@UsuarioAtual() usuario: UsuarioAutenticado) {
    return this.listarSessoes.executar(usuario.idUsuario, usuario.idSessao);
  }

  // Sem :id - "encerrar todas as outras" (nunca a própria, sempre por
  // exclusão de idSessao, ver auth.service.encerrar-sessao.ts).
  @Delete()
  @HttpCode(200)
  encerrarTodasMenosAtual(@UsuarioAtual() usuario: UsuarioAutenticado) {
    return this.encerrarSessao
      .executarTodasMenosAtual(usuario.idUsuario, usuario.idSessao)
      .then((quantidade) => ({ encerradas: quantidade }));
  }

  @Delete(':id')
  @HttpCode(204)
  encerrarUma(
    @Param('id', ParseIntPipe) id: number,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.encerrarSessao.executarUma(usuario.idUsuario, id);
  }
}
