import { Controller, Get, Query } from '@nestjs/common';
import { PagamentoRevisaoRequestLimite } from '../../25-pagamento-revisao/dto/request/pagamento-revisao.request-list';
import { AtualizacaoModeracaoResponse } from '../dto/response/atualizacao-campanha.response';
import { AtualizacaoCampanhaServiceFindAllModeracao } from '../service/atualizacao-campanha.service.findall-moderacao';

@Controller('atualizacao-campanha')
export class AtualizacaoCampanhaControllerFindAllModeracao {
  constructor(
    private readonly service: AtualizacaoCampanhaServiceFindAllModeracao,
  ) {}

  // A RLS escopa (moderação vê todas). O limite é o mesmo das listas do painel financeiro.
  @Get('moderacao')
  listar(
    @Query() query: PagamentoRevisaoRequestLimite,
  ): Promise<AtualizacaoModeracaoResponse[]> {
    return this.service.executar(query.limite);
  }
}
