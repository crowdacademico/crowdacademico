import {
  Controller,
  Delete,
  HttpCode,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { SeguirCampanhaServiceRemove } from '../service/seguir-campanha.service.remove';
import { UsuarioAtual } from '../../commons/auth/usuario-atual.decorator';
import type { UsuarioAutenticado } from '../../commons/auth/usuario-autenticado.interface';

@Controller('seguir-campanha')
export class SeguirCampanhaControllerRemove {
  constructor(private readonly service: SeguirCampanhaServiceRemove) {}

  @Delete(':idCampanha')
  @HttpCode(204)
  async remover(
    @Param('idCampanha', ParseIntPipe) idCampanha: number,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    await this.service.executar(idCampanha, usuario.idUsuario);
  }
}
