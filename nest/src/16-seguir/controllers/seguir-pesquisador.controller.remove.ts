import {
  Controller,
  Delete,
  HttpCode,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { UsuarioAtual } from '../../commons/auth/usuario-atual.decorator';
import type { UsuarioAutenticado } from '../../commons/auth/usuario-autenticado.interface';
import { SeguirPesquisadorServiceRemove } from '../service/seguir-pesquisador.service.remove';

@Controller('seguir-pesquisador')
export class SeguirPesquisadorControllerRemove {
  constructor(private readonly service: SeguirPesquisadorServiceRemove) {}

  @Delete(':idPesquisador')
  @HttpCode(204)
  async remover(
    @Param('idPesquisador', ParseIntPipe) idPesquisador: number,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    await this.service.executar(idPesquisador, usuario.idUsuario);
  }
}
