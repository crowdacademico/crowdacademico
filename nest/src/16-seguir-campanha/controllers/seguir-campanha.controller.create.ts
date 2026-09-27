import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { RequireAuthGuard } from '../../3-auth/guards/require-auth.guard';
import { SeguirCampanhaRequestCreate } from '../dto/request/seguir-campanha.request-create';
import { SeguirCampanhaServiceCreate } from '../service/seguir-campanha.service.create';
import { UsuarioAtual } from '../../commons/auth/usuario-atual.decorator';
import type { UsuarioAutenticado } from '../../commons/auth/usuario-autenticado.interface';

@Controller('seguir-campanha')
export class SeguirCampanhaControllerCreate {
  constructor(private readonly service: SeguirCampanhaServiceCreate) {}

  @Post()
  @UseGuards(RequireAuthGuard)
  criar(
    @Body() dto: SeguirCampanhaRequestCreate,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.service.executar(dto, usuario.idUsuario);
  }
}
