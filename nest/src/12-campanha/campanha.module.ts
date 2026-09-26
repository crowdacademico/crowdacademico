import { Module } from '@nestjs/common';
import { CampanhaControllerAprovar } from './controllers/campanha.controller.aprovar';
import { CampanhaControllerCreate } from './controllers/campanha.controller.create';
import { CampanhaControllerCreateParaOutro } from './controllers/campanha.controller.create-para-outro';
import { CampanhaControllerDeslizarDatas } from './controllers/campanha.controller.deslizar-datas';
import { CampanhaControllerEnviar } from './controllers/campanha.controller.enviar';
import { CampanhaControllerFindAll } from './controllers/campanha.controller.findall';
import { CampanhaControllerFindOne } from './controllers/campanha.controller.findone';
import { CampanhaControllerForcarExclusao } from './controllers/campanha.controller.forcar-exclusao';
import { CampanhaControllerRejeitar } from './controllers/campanha.controller.rejeitar';
import { CampanhaControllerRemove } from './controllers/campanha.controller.remove';
import { CampanhaControllerUpdate } from './controllers/campanha.controller.update';
import { CampanhaServiceAprovar } from './service/campanha.service.aprovar';
import { CampanhaServiceCreate } from './service/campanha.service.create';
import { CampanhaServiceCreateParaOutro } from './service/campanha.service.create-para-outro';
import { CampanhaServiceDeslizarDatas } from './service/campanha.service.deslizar-datas';
import { CampanhaServiceEncerrarVencidas } from './service/campanha.service.encerrar-vencidas';
import { CampanhaServiceEnviar } from './service/campanha.service.enviar';
import { CampanhaServiceExpirarRascunho } from './service/campanha.service.expirar-rascunho';
import { CampanhaServiceExpirarRejeitadas } from './service/campanha.service.expirar-rejeitadas';
import { CampanhaServiceFindAll } from './service/campanha.service.findall';
import { CampanhaServiceFindOne } from './service/campanha.service.findone';
import { CampanhaServiceForcarExclusao } from './service/campanha.service.forcar-exclusao';
import { CampanhaServiceRejeitar } from './service/campanha.service.rejeitar';
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
