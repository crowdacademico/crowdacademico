import { Body, Controller, Post } from '@nestjs/common';
import { LinkAcademicoRequestCreate } from '../dto/request/link-academico.request-create';
import { LinkAcademicoServiceCreate } from '../service/link-academico.service.create';
import { UsuarioAtual } from '../../commons/auth/usuario-atual.decorator';
import type { UsuarioAutenticado } from '../../commons/auth/usuario-autenticado.interface';

@Controller('link-academico')
export class LinkAcademicoControllerCreate {
  constructor(private readonly service: LinkAcademicoServiceCreate) {}

  @Post()
  criar(
    @Body() dto: LinkAcademicoRequestCreate,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.service.executar(dto, usuario.idUsuario);
  }
}
