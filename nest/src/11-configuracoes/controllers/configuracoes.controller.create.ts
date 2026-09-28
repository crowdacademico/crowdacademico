import { Body, Controller, Post } from '@nestjs/common';
import { ConfiguracoesRequestCreate } from '../dto/request/configuracoes.request-create';
import { ConfiguracoesServiceCreate } from '../service/configuracoes.service.create';
import { UsuarioAtual } from '../../commons/auth/usuario-atual.decorator';
import type { UsuarioAutenticado } from '../../commons/auth/usuario-autenticado.interface';

@Controller('configuracoes')
export class ConfiguracoesControllerCreate {
  constructor(private readonly service: ConfiguracoesServiceCreate) {}

  @Post()
  criar(
    @Body() dto: ConfiguracoesRequestCreate,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.service.executar(dto, usuario.idUsuario);
  }
}
