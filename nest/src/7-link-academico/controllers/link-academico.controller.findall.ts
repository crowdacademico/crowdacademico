import { Controller, Get, ParseIntPipe, Query } from '@nestjs/common';
import { LinkAcademicoServiceFindAll } from '../service/link-academico.service.findall';

// Público de propósito (pol_link_select é usuario_visivel, não filtra por
// dono) — é o que monta a lista de links no perfil público do pesquisador.
@Controller('link-academico')
export class LinkAcademicoControllerFindAll {
  constructor(private readonly service: LinkAcademicoServiceFindAll) {}

  @Get()
  listar(@Query('idUsuario', ParseIntPipe) idUsuario: number) {
    return this.service.executar(idUsuario);
  }
}
