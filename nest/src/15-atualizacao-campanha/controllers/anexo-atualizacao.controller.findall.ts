import { Controller, Get, Query } from '@nestjs/common';
import { PagamentoRevisaoRequestLimite } from '../../25-pagamento-revisao/dto/request/pagamento-revisao.request-list';
import { AnexoAtualizacaoResponse } from '../dto/response/anexo-atualizacao.response';
import { AnexoAtualizacaoServiceFindAll } from '../service/anexo-atualizacao.service.findall';

@Controller('anexo-atualizacao')
export class AnexoAtualizacaoControllerFindAll {
  constructor(private readonly service: AnexoAtualizacaoServiceFindAll) {}

  // Exige atualizacao_moderar (403 sem ela). Só leitura. O limite é o mesmo das listas do painel financeiro.
  @Get()
  listar(
    @Query() query: PagamentoRevisaoRequestLimite,
  ): Promise<AnexoAtualizacaoResponse[]> {
    return this.service.executar(query.limite);
  }
}
