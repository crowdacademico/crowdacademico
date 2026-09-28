import { Controller, Param, ParseIntPipe, Post } from '@nestjs/common';
import { CampanhaServiceAprovar } from '../service/campanha.service.approve';
import { UsuarioAtual } from '../../commons/auth/usuario-atual.decorator';
import type { UsuarioAutenticado } from '../../commons/auth/usuario-autenticado.interface';

@Controller('campanha')
export class CampanhaControllerAprovar {
  constructor(private readonly service: CampanhaServiceAprovar) {}

  @Post(':id/aprovar')
  aprovar(
    @Param('id', ParseIntPipe) id: number,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.service.executar(id, usuario.idUsuario);
  }
}
