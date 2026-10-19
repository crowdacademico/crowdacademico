import { Body, Controller, Post } from '@nestjs/common';
import { UsuarioAtual } from '../../commons/auth/usuario-atual.decorator';
import type { UsuarioAutenticado } from '../../commons/auth/usuario-autenticado.interface';
import { SeguirPesquisadorRequestCreate } from '../dto/request/seguir-pesquisador.request-create';
import { SeguirPesquisadorServiceCreate } from '../service/seguir-pesquisador.service.create';

@Controller('seguir-pesquisador')
export class SeguirPesquisadorControllerCreate {
  constructor(private readonly service: SeguirPesquisadorServiceCreate) {}

  @Post()
  criar(
    @Body() dto: SeguirPesquisadorRequestCreate,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.service.executar(dto, usuario.idUsuario);
  }
}
