import { Module } from '@nestjs/common';
import { PagamentoModule } from '../29-pagamento/pagamento.module';
import { ContribuicaoControllerCreate } from './controllers/contribuicao.controller.create';
import { ContribuicaoControllerFind } from './controllers/contribuicao.controller.find';
import { ContribuicaoControllerSummary } from './controllers/contribuicao.controller.summary';
import { ContribuicaoServiceCreate } from './service/contribuicao.service.create';
import { ContribuicaoServiceFind } from './service/contribuicao.service.find';
import { ContribuicaoServiceSummary } from './service/contribuicao.service.summary';

@Module({
  imports: [PagamentoModule],
  controllers: [
    ContribuicaoControllerCreate,
    ContribuicaoControllerFind,
    ContribuicaoControllerSummary,
  ],
  providers: [
    ContribuicaoServiceCreate,
    ContribuicaoServiceFind,
    ContribuicaoServiceSummary,
  ],
})
export class ContribuicaoModule {}
