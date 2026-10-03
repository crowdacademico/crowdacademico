import { Body, Controller, Post } from '@nestjs/common';
import { DenunciaRequestCreate } from '../dto/request/denuncia.request-create';
import { DenunciaServiceCreate } from '../service/denuncia.service.create';
import { UsuarioAtual } from '../../commons/auth/usuario-atual.decorator';
import type { UsuarioAutenticado } from '../../commons/auth/usuario-autenticado.interface';

@Controller('denuncia')
export class DenunciaControllerCreate {
  constructor(private readonly service: DenunciaServiceCreate) {}

  @Post()
  criar(
    @Body() dto: DenunciaRequestCreate,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.service.executar(dto, usuario.idUsuario);
  }
}
