import { Module } from '@nestjs/common';
import { PagamentoModule } from '../29-pagamento/pagamento.module';
import { ContaRecebimentoControllerCreate } from './controllers/conta-recebimento.controller.create';
import { ContaRecebimentoControllerDeactivate } from './controllers/conta-recebimento.controller.deactivate';
import { ContaRecebimentoControllerFindAll } from './controllers/conta-recebimento.controller.findall';
import { ContaRecebimentoServiceCreate } from './service/conta-recebimento.service.create';
import { ContaRecebimentoServiceDeactivate } from './service/conta-recebimento.service.deactivate';
import { ContaRecebimentoServiceFindAll } from './service/conta-recebimento.service.findall';

@Module({
  imports: [PagamentoModule],
  controllers: [
    ContaRecebimentoControllerCreate,
    ContaRecebimentoControllerFindAll,
    ContaRecebimentoControllerDeactivate,
  ],
  providers: [
    ContaRecebimentoServiceCreate,
    ContaRecebimentoServiceFindAll,
    ContaRecebimentoServiceDeactivate,
  ],
})
export class ContaRecebimentoModule {}
