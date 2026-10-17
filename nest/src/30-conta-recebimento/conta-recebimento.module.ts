import { Module } from '@nestjs/common';
import { PagamentoModule } from '../29-pagamento/pagamento.module';
import { ContaRecebimentoControllerCreate } from './controllers/conta-recebimento.controller.create';
import { ContaRecebimentoControllerFindAll } from './controllers/conta-recebimento.controller.findall';
import { ContaRecebimentoControllerFindOne } from './controllers/conta-recebimento.controller.findone';
import { ContaRecebimentoControllerRemove } from './controllers/conta-recebimento.controller.remove';
import { ContaRecebimentoServiceCreate } from './service/conta-recebimento.service.create';
import { ContaRecebimentoServiceFindAll } from './service/conta-recebimento.service.findall';
import { ContaRecebimentoServiceFindOne } from './service/conta-recebimento.service.findone';
import { ContaRecebimentoServiceRemove } from './service/conta-recebimento.service.remove';

@Module({
  imports: [PagamentoModule],
  controllers: [
    ContaRecebimentoControllerCreate,
    ContaRecebimentoControllerFindAll,
    ContaRecebimentoControllerFindOne,
    ContaRecebimentoControllerRemove,
  ],
  providers: [
    ContaRecebimentoServiceCreate,
    ContaRecebimentoServiceFindAll,
    ContaRecebimentoServiceFindOne,
    ContaRecebimentoServiceRemove,
  ],
  // Para a bancada de pagamento do Campo de Testes cadastrar a chave Pix de teste da conta logada.
  exports: [ContaRecebimentoServiceCreate],
})
export class ContaRecebimentoModule {}
