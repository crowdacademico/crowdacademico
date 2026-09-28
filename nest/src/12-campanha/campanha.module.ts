import { Module } from '@nestjs/common';
import { CampanhaControllerAprovar } from './controllers/campanha.controller.approve';
import { CampanhaControllerCreate } from './controllers/campanha.controller.create';
import { CampanhaControllerCreateParaOutro } from './controllers/campanha.controller.create-for-other';
import { CampanhaControllerDeslizarDatas } from './controllers/campanha.controller.shift-dates';
import { CampanhaControllerEnviar } from './controllers/campanha.controller.submit';
import { CampanhaControllerFindAll } from './controllers/campanha.controller.findall';
import { CampanhaControllerFindOne } from './controllers/campanha.controller.findone';
import { CampanhaControllerForcarExclusao } from './controllers/campanha.controller.force-remove';
import { CampanhaControllerRejeitar } from './controllers/campanha.controller.reject';
import { CampanhaControllerRemove } from './controllers/campanha.controller.remove';
import { CampanhaControllerUpdate } from './controllers/campanha.controller.update';
import { CampanhaServiceAprovar } from './service/campanha.service.approve';
import { CampanhaServiceCreate } from './service/campanha.service.create';
import { CampanhaServiceCreateParaOutro } from './service/campanha.service.create-for-other';
import { CampanhaServiceDeslizarDatas } from './service/campanha.service.shift-dates';
import { CampanhaServiceEncerrarVencidas } from './service/campanha.service.close-expired';
import { CampanhaServiceEnviar } from './service/campanha.service.submit';
import { CampanhaServiceExpirarRascunho } from './service/campanha.service.expire-drafts';
import { CampanhaServiceExpirarRejeitadas } from './service/campanha.service.expire-rejected';
import { CampanhaServiceFindAll } from './service/campanha.service.findall';
import { CampanhaServiceFindOne } from './service/campanha.service.findone';
import { CampanhaServiceForcarExclusao } from './service/campanha.service.force-remove';
import { CampanhaServiceRejeitar } from './service/campanha.service.reject';
import { CampanhaServiceRemove } from './service/campanha.service.remove';
import { CampanhaServiceUpdate } from './service/campanha.service.update';

@Module({
  controllers: [
    CampanhaControllerCreate,
    CampanhaControllerCreateParaOutro,
    CampanhaControllerFindAll,
    CampanhaControllerFindOne,
    CampanhaControllerUpdate,
    CampanhaControllerEnviar,
    CampanhaControllerDeslizarDatas,
    CampanhaControllerAprovar,
    CampanhaControllerRejeitar,
    CampanhaControllerRemove,
    CampanhaControllerForcarExclusao,
  ],
  providers: [
    CampanhaServiceCreate,
    CampanhaServiceCreateParaOutro,
    CampanhaServiceFindAll,
    CampanhaServiceFindOne,
    CampanhaServiceUpdate,
    CampanhaServiceEnviar,
    CampanhaServiceDeslizarDatas,
    CampanhaServiceAprovar,
    CampanhaServiceRejeitar,
    CampanhaServiceRemove,
    CampanhaServiceForcarExclusao,
    // Job agendado (RF-057) - registrado aqui só porque o @Cron precisa de
    // um provider vivo pra existir; não é chamado por nenhum controller.
    CampanhaServiceEncerrarVencidas,
    // Job agendado: mesma razão do de cima, expira rascunho de campanha abandonado antes de completar
    // orçamento/cronograma.
    CampanhaServiceExpirarRascunho,
    // Job agendado: exclui rejeitada com prazo de reenvio vencido.
    CampanhaServiceExpirarRejeitadas,
  ],
})
export class CampanhaModule {}
