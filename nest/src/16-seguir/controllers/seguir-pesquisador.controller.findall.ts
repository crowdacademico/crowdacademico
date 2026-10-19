import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { Publico } from '../../commons/auth/publico.decorator';
import { UsuarioAtual } from '../../commons/auth/usuario-atual.decorator';
import type { UsuarioAutenticado } from '../../commons/auth/usuario-autenticado.interface';
import { SeguirPesquisadorServiceCount } from '../service/seguir-pesquisador.service.count';
import { SeguirPesquisadorServiceFindAll } from '../service/seguir-pesquisador.service.findall';

@Controller('seguir-pesquisador')
export class SeguirPesquisadorControllerFindAll {
  constructor(
    private readonly service: SeguirPesquisadorServiceFindAll,
    private readonly contagem: SeguirPesquisadorServiceCount,
  ) {}

  // Os pesquisadores que a conta logada segue.
  @Get()
  listar(@UsuarioAtual() usuario: UsuarioAutenticado) {
    return this.service.executar(usuario.idUsuario);
  }

  // Público: é o número que a página do perfil mostra (RF-028), sem dizer quem segue.
  @Get(':idPesquisador/seguidores')
  @Publico()
  contar(@Param('idPesquisador', ParseIntPipe) idPesquisador: number) {
    return this.contagem.executar(idPesquisador);
  }
}
