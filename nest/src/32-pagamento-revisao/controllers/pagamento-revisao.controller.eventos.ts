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
import { PagamentoRevisaoRequestList } from '../dto/request/pagamento-revisao.request-list';
import { PagamentoRevisaoRequestObservacao } from '../dto/request/pagamento-revisao.request-observacao';
import { RevisaoPagamentoResponse } from '../dto/response/pagamento-revisao.response';
import { PagamentoRevisaoServiceEventos } from '../service/pagamento-revisao.service.eventos';

@Controller('pagamento-admin/revisoes')
export class PagamentoRevisaoControllerEventos {
  constructor(private readonly service: PagamentoRevisaoServiceEventos) {}

  // Exige a permissão evento_pagamento_visualizar (conferida no banco; sem ela, 403).
  @Get()
  listar(
    @Query() query: PagamentoRevisaoRequestList,
  ): Promise<RevisaoPagamentoResponse[]> {
    return this.service.listar(query.situacao, query.limite);
  }

  // Exige pagamento_revisao_resolver. Só evento em revisão manual (409 nos outros casos).
  @Post(':idEvento/resolver')
  @HttpCode(204)
  async resolver(
    @Param('idEvento', ParseIntPipe) idEvento: number,
    @Body() dto: PagamentoRevisaoRequestObservacao,
  ): Promise<void> {
    await this.service.resolver(idEvento, dto.observacao);
  }
}
