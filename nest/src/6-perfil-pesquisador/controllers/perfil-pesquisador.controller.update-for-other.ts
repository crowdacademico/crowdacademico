import {
  Body,
  Controller,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
} from '@nestjs/common';
import { PerfilPesquisadorRequestUpdate } from '../dto/request/perfil-pesquisador.request-update';
import { PerfilPesquisadorServiceUpdateForOther } from '../service/perfil-pesquisador.service.update-for-other';

// PATCH /perfil-pesquisador/:id: o modal Alterar Usuário chama esta rota para salvar tipo de
// vínculo/instituição/título acadêmico de QUEM está sendo editado; o self-service é PATCH /perfil-pesquisador
// (sem id, ver perfil-pesquisador.controller.update.ts), e PATCH /perfil-pesquisador/:id/cpf é outra rota.
// Endpoint separado, nunca reaproveitando o self-service: mesma classe de corrigir-cpf/create-para-outro deste
// módulo.
@Controller('perfil-pesquisador')
export class PerfilPesquisadorControllerUpdateForOther {
  constructor(
    private readonly service: PerfilPesquisadorServiceUpdateForOther,
  ) {}

  @Patch(':id')
  @HttpCode(204)
  alterarDeOutro(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: PerfilPesquisadorRequestUpdate,
  ) {
    return this.service.executar(id, dto);
  }
}
