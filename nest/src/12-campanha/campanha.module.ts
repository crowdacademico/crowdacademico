import { Module } from '@nestjs/common';
import { CampanhaControllerApprove } from './controllers/campanha.controller.approve';
import { CampanhaControllerCreate } from './controllers/campanha.controller.create';
import { CampanhaControllerCreateForOther } from './controllers/campanha.controller.create-for-other';
import { CampanhaControllerShiftDates } from './controllers/campanha.controller.shift-dates';
import { CampanhaControllerSubmit } from './controllers/campanha.controller.submit';
import { CampanhaControllerFindAll } from './controllers/campanha.controller.findall';
import { CampanhaControllerFindOne } from './controllers/campanha.controller.findone';
import { CampanhaControllerForceRemove } from './controllers/campanha.controller.force-remove';
import { CampanhaControllerReject } from './controllers/campanha.controller.reject';
import { CampanhaControllerRemove } from './controllers/campanha.controller.remove';
import { CampanhaControllerUpdate } from './controllers/campanha.controller.update';
import { CampanhaServiceApprove } from './service/campanha.service.approve';
import { CampanhaServiceCreate } from './service/campanha.service.create';
import { CampanhaServiceCreateForOther } from './service/campanha.service.create-for-other';
import { CampanhaServiceShiftDates } from './service/campanha.service.shift-dates';
import { CampanhaServiceCloseExpired } from './service/campanha.service.close-expired';
import { CampanhaServiceSubmit } from './service/campanha.service.submit';
import { CampanhaServiceExpireDrafts } from './service/campanha.service.expire-drafts';
import { CampanhaServiceExpireRejected } from './service/campanha.service.expire-rejected';
import { CampanhaServiceFindAll } from './service/campanha.service.findall';
import { CampanhaServiceFindOne } from './service/campanha.service.findone';
import { CampanhaServiceForceRemove } from './service/campanha.service.force-remove';
import { CampanhaServiceReject } from './service/campanha.service.reject';
import { CampanhaServiceRemove } from './service/campanha.service.remove';
import { CampanhaServiceUpdate } from './service/campanha.service.update';

@Module({
  controllers: [
    CampanhaControllerCreate,
    CampanhaControllerCreateForOther,
    CampanhaControllerFindAll,
    CampanhaControllerFindOne,
    CampanhaControllerUpdate,
    CampanhaControllerSubmit,
    CampanhaControllerShiftDates,
    CampanhaControllerApprove,
    CampanhaControllerReject,
    CampanhaControllerRemove,
    CampanhaControllerForceRemove,
  ],
  providers: [
    CampanhaServiceCreate,
    CampanhaServiceCreateForOther,
    CampanhaServiceFindAll,
    CampanhaServiceFindOne,
    CampanhaServiceUpdate,
    CampanhaServiceSubmit,
    CampanhaServiceShiftDates,
    CampanhaServiceApprove,
    CampanhaServiceReject,
    CampanhaServiceRemove,
    CampanhaServiceForceRemove,
    // Job agendado (RF-057) - registrado aqui só porque o @Cron precisa de
    // um provider vivo pra existir; não é chamado por nenhum controller.
    CampanhaServiceCloseExpired,
    // Job agendado: mesma razão do de cima, expira rascunho de campanha abandonado antes de completar
    // orçamento/cronograma.
    CampanhaServiceExpireDrafts,
    // Job agendado: exclui rejeitada com prazo de reenvio vencido.
    CampanhaServiceExpireRejected,
  ],
})
export class CampanhaModule {}
