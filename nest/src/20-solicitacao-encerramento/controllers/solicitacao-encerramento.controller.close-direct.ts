import { Body, Controller, Post } from '@nestjs/common';
import { SolicitacaoEncerramentoRequestCreate } from '../dto/request/solicitacao-encerramento.request-create';
import { SolicitacaoEncerramentoServiceCloseDirect } from '../service/solicitacao-encerramento.service.close-direct';

@Controller('solicitacao-encerramento')
export class SolicitacaoEncerramentoControllerCloseDirect {
  constructor(
    private readonly service: SolicitacaoEncerramentoServiceCloseDirect,
  ) {}

  @Post('encerrar-direto')
  encerrarDireto(@Body() dto: SolicitacaoEncerramentoRequestCreate) {
    return this.service.executar(dto);
  }
}
