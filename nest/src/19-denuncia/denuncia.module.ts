import { Module } from '@nestjs/common';
import { DenunciaControllerCloseCampaign } from './controllers/denuncia.controller.close-campaign';
import { DenunciaControllerCreate } from './controllers/denuncia.controller.create';
import { DenunciaControllerFindAll } from './controllers/denuncia.controller.findall';
import { DenunciaControllerUpdate } from './controllers/denuncia.controller.update';
import { DenunciaServiceCloseCampaign } from './service/denuncia.service.close-campaign';
import { DenunciaServiceCreate } from './service/denuncia.service.create';
import { DenunciaServiceFindAll } from './service/denuncia.service.findall';
import { DenunciaServiceUpdate } from './service/denuncia.service.update';

@Module({
  controllers: [
    DenunciaControllerCreate,
    DenunciaControllerFindAll,
    DenunciaControllerUpdate,
    DenunciaControllerCloseCampaign,
  ],
  providers: [
    DenunciaServiceCreate,
    DenunciaServiceFindAll,
    DenunciaServiceUpdate,
    DenunciaServiceCloseCampaign,
  ],
})
export class DenunciaModule {}
