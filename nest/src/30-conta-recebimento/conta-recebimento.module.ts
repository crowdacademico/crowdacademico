import { Module } from '@nestjs/common';
import { PagamentoModule } from '../29-pagamento/pagamento.module';
import { ContaRecebimentoControllerCreate } from './controllers/conta-recebimento.controller.create';
import { ContaRecebimentoControllerFindOne } from './controllers/conta-recebimento.controller.findone';
import { ContaRecebimentoControllerRemove } from './controllers/conta-recebimento.controller.remove';
import { ContaRecebimentoServiceCreate } from './service/conta-recebimento.service.create';
import { ContaRecebimentoServiceFindOne } from './service/conta-recebimento.service.findone';
import { ContaRecebimentoServiceRemove } from './service/conta-recebimento.service.remove';

@Module({
  imports: [PagamentoModule],
  controllers: [
    ContaRecebimentoControllerCreate,
    ContaRecebimentoControllerFindOne,
    ContaRecebimentoControllerRemove,
  ],
  providers: [
    ContaRecebimentoServiceCreate,
    ContaRecebimentoServiceFindOne,
    ContaRecebimentoServiceRemove,
  ],
})
export class ContaRecebimentoModule {}
