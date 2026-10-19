import { Module } from '@nestjs/common';
import { PagamentoModule } from '../23-pagamento/pagamento.module';
import { ContribuicaoControllerCreate } from './controllers/contribuicao.controller.create';
import { ContribuicaoControllerFind } from './controllers/contribuicao.controller.find';
import { ContribuicaoControllerFindAllMine } from './controllers/contribuicao.controller.findall-mine';
import { ContribuicaoControllerSummary } from './controllers/contribuicao.controller.summary';
import { ContribuicaoServiceCreate } from './service/contribuicao.service.create';
import { ContribuicaoServiceFind } from './service/contribuicao.service.find';
import { ContribuicaoServiceFindAllMine } from './service/contribuicao.service.findall-mine';
import { ContribuicaoServiceSummary } from './service/contribuicao.service.summary';

@Module({
  imports: [PagamentoModule],
  controllers: [
    ContribuicaoControllerCreate,
    ContribuicaoControllerFindAllMine,
    ContribuicaoControllerFind,
    ContribuicaoControllerSummary,
  ],
  providers: [
    ContribuicaoServiceCreate,
    ContribuicaoServiceFind,
    ContribuicaoServiceFindAllMine,
    ContribuicaoServiceSummary,
  ],
})
export class ContribuicaoModule {}
