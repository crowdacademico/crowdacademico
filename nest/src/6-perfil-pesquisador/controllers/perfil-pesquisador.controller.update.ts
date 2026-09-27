import { Body, Controller, Patch, UseGuards } from '@nestjs/common';
import { RequireAuthGuard } from '../../3-auth/guards/require-auth.guard';
import { PerfilPesquisadorRequestUpdate } from '../dto/request/perfil-pesquisador.request-update';
import { PerfilPesquisadorServiceUpdate } from '../service/perfil-pesquisador.service.update';
import { UsuarioAtual } from '../../commons/auth/usuario-atual.decorator';
import type { UsuarioAutenticado } from '../../commons/auth/usuario-autenticado.interface';

// Sem `:id` de propósito - é sempre o próprio perfil de quem está logado
// (a PK de perfil_pesquisador É id_usuario, um perfil por pessoa). Corrigir
// o CPF de OUTRA pessoa é uma rota/DTO separada (suporte/admin), não esta.
@Controller('perfil-pesquisador')
export class PerfilPesquisadorControllerUpdate {
  constructor(private readonly service: PerfilPesquisadorServiceUpdate) {}

  @Patch()
  @UseGuards(RequireAuthGuard)
  atualizar(
    @Body() dto: PerfilPesquisadorRequestUpdate,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.service.executar(usuario.idUsuario, dto);
  }
}
