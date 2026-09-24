import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { RequireAuthGuard } from '../../3-auth/guards/require-auth.guard';
import { PaginacaoQueryDto } from '../../commons/database/dto/paginacao.query.dto';
import { UsuarioServiceFindAll } from '../service/usuario.service.findall';

// RequireAuthGuard (24-09-2026): a resposta traz e-mail, e a RLS de `usuario`
// é permissiva de propósito (o login precisa achar o usuário antes de existir
// alguém autenticado) - sem guard, qualquer visitante anônimo listava os
// e-mails de todos. Guard só impede o anônimo; quem está logado ainda enxerga
// a lista inteira (decisão de permissão pendente, ver PENDENCIAS).
@Controller('usuario')
@UseGuards(RequireAuthGuard)
export class UsuarioControllerFindAll {
  constructor(private readonly service: UsuarioServiceFindAll) {}

  @Get()
  listar(@Query() paginacao: PaginacaoQueryDto) {
    return this.service.executar(paginacao);
  }
}
