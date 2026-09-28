import { Body, Controller, Post } from '@nestjs/common';
import { SeguirCampanhaRequestCreate } from '../dto/request/seguir-campanha.request-create';
import { SeguirCampanhaServiceCreate } from '../service/seguir-campanha.service.create';
import { UsuarioAtual } from '../../commons/auth/usuario-atual.decorator';
import type { UsuarioAutenticado } from '../../commons/auth/usuario-autenticado.interface';

@Controller('seguir-campanha')
export class SeguirCampanhaControllerCreate {
  constructor(private readonly service: SeguirCampanhaServiceCreate) {}

  @Post()
  criar(
    @Body() dto: SeguirCampanhaRequestCreate,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.service.executar(dto, usuario.idUsuario);
  }
}
