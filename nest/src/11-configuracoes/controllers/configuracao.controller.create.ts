import { Body, Controller, Post } from '@nestjs/common';
import { ConfiguracaoRequestCreate } from '../dto/request/configuracao.request-create';
import { ConfiguracaoServiceCreate } from '../service/configuracao.service.create';
import { UsuarioAtual } from '../../commons/auth/usuario-atual.decorator';
import type { UsuarioAutenticado } from '../../commons/auth/usuario-autenticado.interface';

@Controller('configuracoes')
export class ConfiguracaoControllerCreate {
  constructor(private readonly service: ConfiguracaoServiceCreate) {}

  @Post()
  criar(
    @Body() dto: ConfiguracaoRequestCreate,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.service.executar(dto, usuario.idUsuario);
  }
}
