import {
  Controller,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { RequireAuthGuard } from '../../3-auth/guards/require-auth.guard';
import { CampanhaServiceAprovar } from '../service/campanha.service.aprovar';
import { UsuarioAtual } from '../../commons/auth/usuario-atual.decorator';
import type { UsuarioAutenticado } from '../../commons/auth/usuario-autenticado.interface';

@Controller('campanha')
export class CampanhaControllerAprovar {
  constructor(private readonly service: CampanhaServiceAprovar) {}

  @Post(':id/aprovar')
  @UseGuards(RequireAuthGuard)
  aprovar(
    @Param('id', ParseIntPipe) id: number,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.service.executar(id, usuario.idUsuario);
  }
}
