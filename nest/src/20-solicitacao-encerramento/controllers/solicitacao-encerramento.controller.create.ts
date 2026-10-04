import { Body, Controller, Post } from '@nestjs/common';
import { SolicitacaoEncerramentoRequestCreate } from '../dto/request/solicitacao-encerramento.request-create';
import { SolicitacaoEncerramentoServiceCreate } from '../service/solicitacao-encerramento.service.create';

@Controller('solicitacao-encerramento')
export class SolicitacaoEncerramentoControllerCreate {
  constructor(private readonly service: SolicitacaoEncerramentoServiceCreate) {}

  @Post()
  pedir(@Body() dto: SolicitacaoEncerramentoRequestCreate) {
    return this.service.executar(dto);
  }
}
