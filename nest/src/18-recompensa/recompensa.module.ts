import { Module } from '@nestjs/common';
import { RecompensaController } from './controllers/recompensa.controller';
import { RecompensaServiceCreate } from './service/recompensa.service.create';
import { RecompensaServiceFindAll } from './service/recompensa.service.findall';
import { RecompensaServiceRemove } from './service/recompensa.service.remove';
import { RecompensaServiceUpdate } from './service/recompensa.service.update';

@Module({
  controllers: [RecompensaController],
  providers: [
    RecompensaServiceFindAll,
    RecompensaServiceCreate,
    RecompensaServiceUpdate,
    RecompensaServiceRemove,
  ],
})
export class RecompensaModule {}
