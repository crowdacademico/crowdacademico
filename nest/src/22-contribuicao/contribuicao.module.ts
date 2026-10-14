import { Module } from '@nestjs/common';
import { PagamentoModule } from '../29-pagamento/pagamento.module';
import { ContribuicaoControllerCreate } from './controllers/contribuicao.controller.create';
import { ContribuicaoControllerFind } from './controllers/contribuicao.controller.find';
import { ContribuicaoServiceCreate } from './service/contribuicao.service.create';
import { ContribuicaoServiceFind } from './service/contribuicao.service.find';

@Module({
  imports: [PagamentoModule],
  controllers: [ContribuicaoControllerCreate, ContribuicaoControllerFind],
  providers: [ContribuicaoServiceCreate, ContribuicaoServiceFind],
})
export class ContribuicaoModule {}
