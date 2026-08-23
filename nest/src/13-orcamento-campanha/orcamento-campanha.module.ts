import { Module } from '@nestjs/common';
import { OrcamentoCampanhaControllerCreate } from './controllers/orcamento-campanha.controller.create';
import { OrcamentoCampanhaControllerFindAll } from './controllers/orcamento-campanha.controller.findall';
import { OrcamentoCampanhaControllerRemove } from './controllers/orcamento-campanha.controller.remove';
import { OrcamentoCampanhaControllerUpdate } from './controllers/orcamento-campanha.controller.update';
import { OrcamentoCampanhaServiceCreate } from './service/orcamento-campanha.service.create';
import { OrcamentoCampanhaServiceFindAll } from './service/orcamento-campanha.service.findall';
import { OrcamentoCampanhaServiceRemove } from './service/orcamento-campanha.service.remove';
import { OrcamentoCampanhaServiceUpdate } from './service/orcamento-campanha.service.update';

@Module({
  controllers: [
    OrcamentoCampanhaControllerCreate,
    OrcamentoCampanhaControllerFindAll,
    OrcamentoCampanhaControllerUpdate,
    OrcamentoCampanhaControllerRemove,
  ],
  providers: [
    OrcamentoCampanhaServiceCreate,
    OrcamentoCampanhaServiceFindAll,
    OrcamentoCampanhaServiceUpdate,
    OrcamentoCampanhaServiceRemove,
  ],
})
export class OrcamentoCampanhaModule {}
