import { Module } from '@nestjs/common';
import { SeguirCampanhaControllerCreate } from './controllers/seguir-campanha.controller.create';
import { SeguirCampanhaControllerFindAll } from './controllers/seguir-campanha.controller.findall';
import { SeguirCampanhaControllerRemove } from './controllers/seguir-campanha.controller.remove';
import { SeguirCampanhaServiceCreate } from './service/seguir-campanha.service.create';
import { SeguirCampanhaServiceFindAll } from './service/seguir-campanha.service.findall';
import { SeguirCampanhaServiceRemove } from './service/seguir-campanha.service.remove';

@Module({
  controllers: [
    SeguirCampanhaControllerCreate,
    SeguirCampanhaControllerFindAll,
    SeguirCampanhaControllerRemove,
  ],
  providers: [
    SeguirCampanhaServiceCreate,
    SeguirCampanhaServiceFindAll,
    SeguirCampanhaServiceRemove,
  ],
})
export class SeguirCampanhaModule {}
