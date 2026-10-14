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
import { PagamentoRevisaoRequestLimite } from '../dto/request/pagamento-revisao.request-list';
import { PagamentoRevisaoRequestObservacao } from '../dto/request/pagamento-revisao.request-observacao';
import { RepasseAtencaoResponse } from '../dto/response/pagamento-revisao.response';
import { PagamentoRevisaoServiceRepasses } from '../service/pagamento-revisao.service.repasses';

@Controller('pagamento-admin/repasses')
export class PagamentoRevisaoControllerRepasses {
  constructor(private readonly service: PagamentoRevisaoServiceRepasses) {}

  // Exige evento_pagamento_visualizar.
  @Get('atencao')
  listar(
    @Query() query: PagamentoRevisaoRequestLimite,
  ): Promise<RepasseAtencaoResponse[]> {
    return this.service.listar(query.limite);
  }

  // Exige pagamento_revisao_resolver. Só repasse em 'erro' (409 nos outros casos).
  @Post(':idRepasse/reenfileirar')
  @HttpCode(204)
  async reenfileirar(
    @Param('idRepasse', ParseIntPipe) idRepasse: number,
    @Body() dto: PagamentoRevisaoRequestObservacao,
  ): Promise<void> {
    await this.service.reenfileirar(idRepasse, dto.observacao);
  }
}
