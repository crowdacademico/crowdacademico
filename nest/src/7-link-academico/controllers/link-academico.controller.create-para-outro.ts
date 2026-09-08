import {
  Body,
  Controller,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { RequireAuthGuard } from '../../3-auth/guards/require-auth.guard';
import { LinkAcademicoRequestCreate } from '../dto/request/link-academico.request-create';
import { LinkAcademicoServiceCreate } from '../service/link-academico.service.create';

// Endpoint separado do POST /link-academico self-service (08-09-2026,
// achado do Lucas: "não consigo colocar link acadêmico novo pros
// pesquisadores" em T1/Bancada do Pesquisador) - mesma classe de bug já
// corrigida em perfil-pesquisador (criar_perfil_pesquisador_para_outro):
// o self-service SEMPRE cria em nome de quem está logado
// (request.user.idUsuario), então Admin tentando adicionar link pra OUTRO
// pesquisador selecionado sempre criava (ou falhava tentando criar) em
// nome do próprio Admin. Reaproveita o MESMO LinkAcademicoServiceCreate
// (já recebe idUsuario como parâmetro separado) - só troca de onde esse
// id vem. Gateado pela RLS (pol_link_insert, 04), não por uma função
// SECURITY DEFINER - reaproveita a mesma permissão 'link_academico_
// gerenciar' que já libera UPDATE/DELETE de link de outra pessoa, nenhuma
// permissão nova precisou ser criada.
@Controller('link-academico')
export class LinkAcademicoControllerCreateParaOutro {
  constructor(private readonly service: LinkAcademicoServiceCreate) {}

  @Post(':idUsuario')
  @UseGuards(RequireAuthGuard)
  criarParaOutro(
    @Param('idUsuario', ParseIntPipe) idUsuario: number,
    @Body() dto: LinkAcademicoRequestCreate,
  ) {
    return this.service.executar(dto, idUsuario);
  }
}
