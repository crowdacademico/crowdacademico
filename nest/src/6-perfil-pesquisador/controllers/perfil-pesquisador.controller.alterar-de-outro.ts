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

// PATCH /perfil-pesquisador/:id - achado (14-09-2026) rodando o painel
// admin de verdade ("Cannot PATCH /perfil-pesquisador/1"): o modal Alterar
// Usuário sempre chama esta rota pra salvar tipo de vínculo/instituição/
// título acadêmico de QUEM está sendo editado, mas essa rota nunca existiu
// - só existia PATCH /perfil-pesquisador (sem id, self-service, ver
// perfil-pesquisador.controller.update.ts) e PATCH /perfil-pesquisador/:id/
// cpf. Endpoint separado, nunca reaproveitando o self-service - mesma
// classe de corrigir-cpf/create-para-outro deste módulo.
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
