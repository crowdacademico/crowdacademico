import { Controller, Param, ParseIntPipe, Post } from '@nestjs/common';
import { CampanhaServiceApprove } from '../service/campanha.service.approve';
import { UsuarioAtual } from '../../commons/auth/usuario-atual.decorator';
import type { UsuarioAutenticado } from '../../commons/auth/usuario-autenticado.interface';

@Controller('campanha')
export class CampanhaControllerApprove {
  constructor(private readonly service: CampanhaServiceApprove) {}

  @Post(':id/aprovar')
  aprovar(
    @Param('id', ParseIntPipe) id: number,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.service.executar(id, usuario.idUsuario);
  }
}
