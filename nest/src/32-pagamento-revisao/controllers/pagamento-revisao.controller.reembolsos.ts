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

  // Exige pagamento_revisao_resolver. Registra que a devolução foi feita POR FORA do sistema; não move dinheiro.
  @Post(':idContribuicao/concluir')
  @HttpCode(204)
  async concluir(
    @Param('idContribuicao', ParseIntPipe) idContribuicao: number,
    @Body() dto: PagamentoRevisaoRequestConcluirReembolso,
  ): Promise<void> {
    await this.service.concluir(idContribuicao, dto.valor, dto.observacao);
  }
}
