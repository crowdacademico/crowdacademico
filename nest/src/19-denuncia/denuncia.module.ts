import { Module } from '@nestjs/common';
import { DenunciaControllerCloseCampaign } from './controllers/denuncia.controller.close-campaign';
import { DenunciaControllerCreate } from './controllers/denuncia.controller.create';
import { DenunciaControllerFindAll } from './controllers/denuncia.controller.findall';
import { DenunciaControllerUpdate } from './controllers/denuncia.controller.update';
import { DenunciaControllerContest } from './controllers/denuncia.controller.contest';
import { DenunciaControllerDecideContest } from './controllers/denuncia.controller.decide-contest';
import { DenunciaControllerFindAgainstMe } from './controllers/denuncia.controller.find-against-me';
import { DenunciaServiceCloseCampaign } from './service/denuncia.service.close-campaign';
import { DenunciaServiceCreate } from './service/denuncia.service.create';
import { DenunciaServiceFindAll } from './service/denuncia.service.findall';
import { DenunciaServiceUpdate } from './service/denuncia.service.update';
import { DenunciaServiceContest } from './service/denuncia.service.contest';
import { DenunciaServiceDecideContest } from './service/denuncia.service.decide-contest';
import { DenunciaServiceFindAgainstMe } from './service/denuncia.service.find-against-me';

@Module({
  controllers: [
    DenunciaControllerCreate,
    DenunciaControllerFindAll,
    DenunciaControllerUpdate,
    DenunciaControllerCloseCampaign,
    DenunciaControllerFindAgainstMe,
    DenunciaControllerContest,
    DenunciaControllerDecideContest,
  ],
  providers: [
    DenunciaServiceCreate,
    DenunciaServiceFindAll,
    DenunciaServiceUpdate,
    DenunciaServiceCloseCampaign,
    DenunciaServiceFindAgainstMe,
    DenunciaServiceContest,
    DenunciaServiceDecideContest,
  ],
})
export class DenunciaModule {}
