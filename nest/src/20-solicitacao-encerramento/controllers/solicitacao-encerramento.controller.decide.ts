import { Body, Controller, Param, ParseIntPipe, Post } from '@nestjs/common';
import { SolicitacaoEncerramentoRequestDecide } from '../dto/request/solicitacao-encerramento.request-decide';
import { SolicitacaoEncerramentoServiceDecide } from '../service/solicitacao-encerramento.service.decide';

@Controller('solicitacao-encerramento')
export class SolicitacaoEncerramentoControllerDecide {
  constructor(private readonly service: SolicitacaoEncerramentoServiceDecide) {}

  @Post(':id/decidir')
  decidir(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SolicitacaoEncerramentoRequestDecide,
  ) {
    return this.service.executar(id, dto);
  }
}
