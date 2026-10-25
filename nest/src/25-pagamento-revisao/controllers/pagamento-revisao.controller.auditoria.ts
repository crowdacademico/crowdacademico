import { Controller, Get, Query } from '@nestjs/common';
import { PagamentoRevisaoRequestLimite } from '../dto/request/pagamento-revisao.request-list';
import { AuditoriaFinanceiraResponse } from '../dto/response/pagamento-revisao.response';
import { PagamentoRevisaoServiceAuditoria } from '../service/pagamento-revisao.service.auditoria';

@Controller('pagamento-admin/auditoria-financeira')
export class PagamentoRevisaoControllerAuditoria {
  constructor(private readonly service: PagamentoRevisaoServiceAuditoria) {}

  // Exige auditoria_financeira_visualizar (403 sem ela). Só leitura.
  @Get()
  listar(
    @Query() query: PagamentoRevisaoRequestLimite,
  ): Promise<AuditoriaFinanceiraResponse[]> {
    return this.service.listar(query.limite);
  }
}
