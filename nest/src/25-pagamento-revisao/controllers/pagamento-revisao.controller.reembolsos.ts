import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { UsuarioAtual } from '../../commons/auth/usuario-atual.decorator';
import type { UsuarioAutenticado } from '../../commons/auth/usuario-autenticado.interface';
import { SemTransacaoGlobal } from '../../commons/database/sem-transacao-global.decorator';
import { PagamentoRevisaoRequestConcluirReembolso } from '../dto/request/pagamento-revisao.request-concluir-reembolso';
import { PagamentoRevisaoRequestLimite } from '../dto/request/pagamento-revisao.request-list';
import { ReembolsoManualResponse } from '../dto/response/pagamento-revisao.response';
import { PagamentoRevisaoServiceReembolsos } from '../service/pagamento-revisao.service.reembolsos';

@Controller('pagamento-admin/reembolsos-manuais')
export class PagamentoRevisaoControllerReembolsos {
  constructor(private readonly service: PagamentoRevisaoServiceReembolsos) {}

  // Exige evento_pagamento_visualizar.
  @Get()
  listar(
    @Query() query: PagamentoRevisaoRequestLimite,
  ): Promise<ReembolsoManualResponse[]> {
    return this.service.listar(query.limite);
  }

  // Exige pagamento_revisao_resolver. Registra a devolução feita pelo painel do provedor, só se o provedor a mostrar
  // (409 sem ela); não move dinheiro. Sem a transação global: espera o provedor no meio.
  @Post(':idContribuicao/concluir')
  @HttpCode(204)
  @SemTransacaoGlobal()
  async concluir(
    @Param('idContribuicao', ParseIntPipe) idContribuicao: number,
    @Body() dto: PagamentoRevisaoRequestConcluirReembolso,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ): Promise<void> {
    await this.service.concluir(
      idContribuicao,
      dto.valor,
      dto.observacao,
      usuario.idUsuario,
    );
  }
}
