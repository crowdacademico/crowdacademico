import { Module } from '@nestjs/common';
import { CampanhaControllerAprovar } from './controllers/campanha.controller.aprovar';
import { CampanhaControllerCreate } from './controllers/campanha.controller.create';
import { CampanhaControllerFindAll } from './controllers/campanha.controller.findall';
import { CampanhaControllerFindOne } from './controllers/campanha.controller.findone';
import { CampanhaControllerRejeitar } from './controllers/campanha.controller.rejeitar';
import { CampanhaControllerUpdate } from './controllers/campanha.controller.update';
import { CampanhaServiceAprovar } from './service/campanha.service.aprovar';
import { CampanhaServiceCreate } from './service/campanha.service.create';
import { CampanhaServiceFindAll } from './service/campanha.service.findall';
import { CampanhaServiceFindOne } from './service/campanha.service.findone';
import { CampanhaServiceRejeitar } from './service/campanha.service.rejeitar';
import { CampanhaServiceUpdate } from './service/campanha.service.update';

@Module({
  controllers: [
    CampanhaControllerCreate,
    CampanhaControllerFindAll,
    CampanhaControllerFindOne,
    CampanhaControllerUpdate,
    CampanhaControllerAprovar,
    CampanhaControllerRejeitar,
  ],
  providers: [
    CampanhaServiceCreate,
    CampanhaServiceFindAll,
    CampanhaServiceFindOne,
    CampanhaServiceUpdate,
    CampanhaServiceAprovar,
    CampanhaServiceRejeitar,
  ],
})
export class CampanhaModule {}
