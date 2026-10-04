import { Controller, Param, ParseIntPipe, Post } from '@nestjs/common';
import { SolicitacaoEncerramentoServiceCancel } from '../service/solicitacao-encerramento.service.cancel';

@Controller('solicitacao-encerramento')
export class SolicitacaoEncerramentoControllerCancel {
  constructor(private readonly service: SolicitacaoEncerramentoServiceCancel) {}

  @Post(':id/cancelar')
  cancelar(@Param('id', ParseIntPipe) id: number) {
    return this.service.executar(id);
  }
}
