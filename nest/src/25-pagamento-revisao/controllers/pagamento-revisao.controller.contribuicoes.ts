import { Controller, Get, Query } from '@nestjs/common';
import { PagamentoRevisaoRequestLimite } from '../dto/request/pagamento-revisao.request-list';
import { ContribuicaoAdminResponse } from '../dto/response/pagamento-revisao.response';
import { PagamentoRevisaoServiceContribuicoes } from '../service/pagamento-revisao.service.contribuicoes';

@Controller('pagamento-admin/contribuicoes')
export class PagamentoRevisaoControllerContribuicoes {
  constructor(private readonly service: PagamentoRevisaoServiceContribuicoes) {}

  // Exige contribuicao_visualizar_sensivel (403 sem ela). Só leitura.
  @Get()
  listar(
    @Query() query: PagamentoRevisaoRequestLimite,
  ): Promise<ContribuicaoAdminResponse[]> {
    return this.service.listar(query.limite);
  }
}
