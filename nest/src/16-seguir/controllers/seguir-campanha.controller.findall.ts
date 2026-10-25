import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { Publico } from '../../commons/auth/publico.decorator';
import { SeguirCampanhaServiceCount } from '../service/seguir-campanha.service.count';
import { SeguirCampanhaServiceFindAll } from '../service/seguir-campanha.service.findall';
import { UsuarioAtual } from '../../commons/auth/usuario-atual.decorator';
import type { UsuarioAutenticado } from '../../commons/auth/usuario-autenticado.interface';

@Controller('seguir-campanha')
export class SeguirCampanhaControllerFindAll {
  constructor(
    private readonly service: SeguirCampanhaServiceFindAll,
    private readonly contagem: SeguirCampanhaServiceCount,
  ) {}

  @Get()
  listar(@UsuarioAtual() usuario: UsuarioAutenticado) {
    return this.service.executar(usuario.idUsuario);
  }

  // Público: o número da página da campanha, sem dizer quem segue.
  @Get(':idCampanha/seguidores')
  @Publico()
  contar(@Param('idCampanha', ParseIntPipe) idCampanha: number) {
    return this.contagem.executar(idCampanha);
  }
}
