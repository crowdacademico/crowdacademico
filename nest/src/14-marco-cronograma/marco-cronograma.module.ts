import { Module } from '@nestjs/common';
import { MarcoCronogramaControllerCreate } from './controllers/marco-cronograma.controller.create';
import { MarcoCronogramaControllerFindAll } from './controllers/marco-cronograma.controller.findall';
import { MarcoCronogramaControllerRemove } from './controllers/marco-cronograma.controller.remove';
import { MarcoCronogramaControllerUpdate } from './controllers/marco-cronograma.controller.update';
import { MarcoCronogramaServiceCreate } from './service/marco-cronograma.service.create';
import { MarcoCronogramaServiceFindAll } from './service/marco-cronograma.service.findall';
import { MarcoCronogramaServiceRemove } from './service/marco-cronograma.service.remove';
import { MarcoCronogramaServiceUpdate } from './service/marco-cronograma.service.update';

@Module({
  controllers: [
    MarcoCronogramaControllerCreate,
    MarcoCronogramaControllerFindAll,
    MarcoCronogramaControllerUpdate,
    MarcoCronogramaControllerRemove,
  ],
  providers: [
    MarcoCronogramaServiceCreate,
    MarcoCronogramaServiceFindAll,
    MarcoCronogramaServiceUpdate,
    MarcoCronogramaServiceRemove,
  ],
})
export class MarcoCronogramaModule {}
