import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { RequireAuthGuard } from '../../3-auth/guards/require-auth.guard';
import { ConfiguracaoRequestCreate } from '../dto/request/configuracao.request-create';
import { ConfiguracaoServiceCreate } from '../service/configuracao.service.create';
import { UsuarioAtual } from '../../commons/auth/usuario-atual.decorator';
import type { UsuarioAutenticado } from '../../commons/auth/usuario-autenticado.interface';

@Controller('configuracoes')
export class ConfiguracaoControllerCreate {
  constructor(private readonly service: ConfiguracaoServiceCreate) {}

  @Post()
  @UseGuards(RequireAuthGuard)
  criar(
    @Body() dto: ConfiguracaoRequestCreate,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.service.executar(dto, usuario.idUsuario);
  }
}
