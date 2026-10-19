import { Controller, Get, ParseIntPipe, Query } from '@nestjs/common';
import { Publico } from '../../commons/auth/publico.decorator';
import { UsuarioAtual } from '../../commons/auth/usuario-atual.decorator';
import type { UsuarioAutenticado } from '../../commons/auth/usuario-autenticado.interface';
import { RecompensaServiceFindAll } from '../service/recompensa.service.findall';
import { RecompensaServiceMine } from '../service/recompensa.service.mine';

@Controller('recompensa')
export class RecompensaControllerFindAll {
  constructor(
    private readonly service: RecompensaServiceFindAll,
    private readonly minhas: RecompensaServiceMine,
  ) {}

  // Público: as recompensas aparecem na página da campanha (os links só para quem pode, pela RLS).
  @Get()
  @Publico()
  listar(@Query('idCampanha', ParseIntPipe) idCampanha: number) {
    return this.service.executar(idCampanha);
  }

  // As recompensas que a conta logada ganhou, com o link especial.
  @Get('minhas')
  listarMinhas(@UsuarioAtual() usuario: UsuarioAutenticado) {
    return this.minhas.executar(usuario.idUsuario);
  }
}
