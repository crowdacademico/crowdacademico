import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { RequireAuthGuard } from '../../3-auth/guards/require-auth.guard';
import { CampanhaRequestCreate } from '../dto/request/campanha.request-create';
import { CampanhaServiceCreate } from '../service/campanha.service.create';
import { UsuarioAtual } from '../../commons/auth/usuario-atual.decorator';
import type { UsuarioAutenticado } from '../../commons/auth/usuario-autenticado.interface';

@Controller('campanha')
export class CampanhaControllerCreate {
  constructor(private readonly service: CampanhaServiceCreate) {}

  @Post()
  @UseGuards(RequireAuthGuard)
  criar(
    @Body() dto: CampanhaRequestCreate,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.service.executar(dto, usuario.idUsuario);
  }
}
