import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { RequireAuthGuard } from '../../3-auth/guards/require-auth.guard';
import { LinkAcademicoRequestCreate } from '../dto/request/link-academico.request-create';
import { LinkAcademicoServiceCreate } from '../service/link-academico.service.create';
import { UsuarioAtual } from '../../commons/auth/usuario-atual.decorator';
import type { UsuarioAutenticado } from '../../commons/auth/usuario-autenticado.interface';

@Controller('link-academico')
export class LinkAcademicoControllerCreate {
  constructor(private readonly service: LinkAcademicoServiceCreate) {}

  @Post()
  @UseGuards(RequireAuthGuard)
  criar(
    @Body() dto: LinkAcademicoRequestCreate,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.service.executar(dto, usuario.idUsuario);
  }
}
