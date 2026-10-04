import { Module } from '@nestjs/common';
import { SolicitacaoEncerramentoControllerCreate } from './controllers/solicitacao-encerramento.controller.create';
import { SolicitacaoEncerramentoControllerCloseDirect } from './controllers/solicitacao-encerramento.controller.close-direct';
import { SolicitacaoEncerramentoControllerFindAll } from './controllers/solicitacao-encerramento.controller.findall';
import { SolicitacaoEncerramentoControllerCancel } from './controllers/solicitacao-encerramento.controller.cancel';
import { SolicitacaoEncerramentoControllerDecide } from './controllers/solicitacao-encerramento.controller.decide';
import { SolicitacaoEncerramentoServiceCreate } from './service/solicitacao-encerramento.service.create';
import { SolicitacaoEncerramentoServiceCloseDirect } from './service/solicitacao-encerramento.service.close-direct';
import { SolicitacaoEncerramentoServiceFindAll } from './service/solicitacao-encerramento.service.findall';
import { SolicitacaoEncerramentoServiceCancel } from './service/solicitacao-encerramento.service.cancel';
import { SolicitacaoEncerramentoServiceDecide } from './service/solicitacao-encerramento.service.decide';

@Module({
  controllers: [
    SolicitacaoEncerramentoControllerCreate,
    SolicitacaoEncerramentoControllerCloseDirect,
    SolicitacaoEncerramentoControllerFindAll,
    SolicitacaoEncerramentoControllerCancel,
    SolicitacaoEncerramentoControllerDecide,
  ],
  providers: [
    SolicitacaoEncerramentoServiceCreate,
    SolicitacaoEncerramentoServiceCloseDirect,
    SolicitacaoEncerramentoServiceFindAll,
    SolicitacaoEncerramentoServiceCancel,
    SolicitacaoEncerramentoServiceDecide,
  ],
})
export class SolicitacaoEncerramentoModule {}
