import { Body, Controller, Param, ParseIntPipe, Post } from '@nestjs/common';
import { CampanhaRequestReject } from '../dto/request/campanha.request-reject';
import { CampanhaServiceReject } from '../service/campanha.service.reject';
import { UsuarioAtual } from '../../commons/auth/usuario-atual.decorator';
import type { UsuarioAutenticado } from '../../commons/auth/usuario-autenticado.interface';

@Controller('campanha')
export class CampanhaControllerReject {
  constructor(private readonly service: CampanhaServiceReject) {}

  @Post(':id/rejeitar')
  rejeitar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CampanhaRequestReject,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.service.executar(id, usuario.idUsuario, dto);
  }
}
