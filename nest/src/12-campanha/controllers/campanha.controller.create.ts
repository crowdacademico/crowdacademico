import { Body, Controller, Post } from '@nestjs/common';
import { CampanhaRequestCreate } from '../dto/request/campanha.request-create';
import { CampanhaServiceCreate } from '../service/campanha.service.create';
import { UsuarioAtual } from '../../commons/auth/usuario-atual.decorator';
import type { UsuarioAutenticado } from '../../commons/auth/usuario-autenticado.interface';

@Controller('campanha')
export class CampanhaControllerCreate {
  constructor(private readonly service: CampanhaServiceCreate) {}

  @Post()
  criar(
    @Body() dto: CampanhaRequestCreate,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.service.executar(dto, usuario.idUsuario);
  }
}
