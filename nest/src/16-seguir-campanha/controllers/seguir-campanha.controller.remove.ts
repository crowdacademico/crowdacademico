import {
  Controller,
  Delete,
  HttpCode,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { RequireAuthGuard } from '../../3-auth/guards/require-auth.guard';
import { SeguirCampanhaServiceRemove } from '../service/seguir-campanha.service.remove';
import { UsuarioAtual } from '../../commons/auth/usuario-atual.decorator';
import type { UsuarioAutenticado } from '../../commons/auth/usuario-autenticado.interface';

@Controller('seguir-campanha')
export class SeguirCampanhaControllerRemove {
  constructor(private readonly service: SeguirCampanhaServiceRemove) {}

  @Delete(':idCampanha')
  @HttpCode(204)
  @UseGuards(RequireAuthGuard)
  async remover(
    @Param('idCampanha', ParseIntPipe) idCampanha: number,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    await this.service.executar(idCampanha, usuario.idUsuario);
  }
}
