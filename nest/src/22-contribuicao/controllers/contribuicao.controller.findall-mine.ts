import { Controller, Get } from '@nestjs/common';
import { UsuarioAtual } from '../../commons/auth/usuario-atual.decorator';
import type { UsuarioAutenticado } from '../../commons/auth/usuario-autenticado.interface';
import { ContribuicaoServiceFindAllMine } from '../service/contribuicao.service.findall-mine';

// Registrado ANTES de ContribuicaoControllerFind no módulo: "minhas" não pode cair em GET /contribuicao/:idContribuicao.
@Controller('contribuicao')
export class ContribuicaoControllerFindAllMine {
  constructor(private readonly service: ContribuicaoServiceFindAllMine) {}

  @Get('minhas')
  listar(@UsuarioAtual() usuario: UsuarioAutenticado) {
    return this.service.executar(usuario.idUsuario);
  }
}
