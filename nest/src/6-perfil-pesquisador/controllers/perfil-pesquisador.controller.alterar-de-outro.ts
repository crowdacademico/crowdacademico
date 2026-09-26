import {
  Body,
  Controller,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { RequireAuthGuard } from '../../3-auth/guards/require-auth.guard';
import { PerfilPesquisadorRequestUpdate } from '../dto/request/perfil-pesquisador.request-update';
import { PerfilPesquisadorServiceAlterarDeOutro } from '../service/perfil-pesquisador.service.alterar-de-outro';

// PATCH /perfil-pesquisador/:id: o modal Alterar Usuário chama esta rota para salvar tipo de
// vínculo/instituição/título acadêmico de QUEM está sendo editado; o self-service é PATCH /perfil-pesquisador
// (sem id, ver perfil-pesquisador.controller.update.ts), e PATCH /perfil-pesquisador/:id/cpf é outra rota.
// Endpoint separado, nunca reaproveitando o self-service: mesma classe de corrigir-cpf/create-para-outro deste
// módulo.
@Controller('perfil-pesquisador')
export class PerfilPesquisadorControllerAlterarDeOutro {
  constructor(
    private readonly service: PerfilPesquisadorServiceAlterarDeOutro,
  ) {}

  @Patch(':id')
  @HttpCode(204)
  @UseGuards(RequireAuthGuard)
  alterarDeOutro(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: PerfilPesquisadorRequestUpdate,
  ) {
    return this.service.executar(id, dto);
  }
}
