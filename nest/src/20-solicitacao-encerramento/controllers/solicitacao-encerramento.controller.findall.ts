import { Controller, Get, Query } from '@nestjs/common';
import { SolicitacaoEncerramentoRequestList } from '../dto/request/solicitacao-encerramento.request-list';
import { SolicitacaoEncerramentoServiceFindAll } from '../service/solicitacao-encerramento.service.findall';

// pol_solicitacao_select (04) decide o que cada um vê.
@Controller('solicitacao-encerramento')
export class SolicitacaoEncerramentoControllerFindAll {
  constructor(
    private readonly service: SolicitacaoEncerramentoServiceFindAll,
  ) {}

  @Get()
  listar(@Query() filtro: SolicitacaoEncerramentoRequestList) {
    return this.service.executar(filtro);
  }
}
