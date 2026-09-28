import { Module } from '@nestjs/common';
import { TermoUsoModule } from '../5-termo-uso/termo-uso.module';
import { PerfilPesquisadorControllerUpdateForOther } from './controllers/perfil-pesquisador.controller.update-for-other';
import { PerfilPesquisadorControllerFixCpf } from './controllers/perfil-pesquisador.controller.fix-cpf';
import { PerfilPesquisadorControllerCreate } from './controllers/perfil-pesquisador.controller.create';
import { PerfilPesquisadorControllerCreateForOther } from './controllers/perfil-pesquisador.controller.create-for-other';
import { PerfilPesquisadorControllerFindAll } from './controllers/perfil-pesquisador.controller.findall';
import { PerfilPesquisadorControllerFindOne } from './controllers/perfil-pesquisador.controller.findone';
import { PerfilPesquisadorControllerReactivate } from './controllers/perfil-pesquisador.controller.reactivate';
import { PerfilPesquisadorControllerSuspend } from './controllers/perfil-pesquisador.controller.suspend';
import { PerfilPesquisadorControllerUpdate } from './controllers/perfil-pesquisador.controller.update';
import { PerfilPesquisadorServiceUpdateForOther } from './service/perfil-pesquisador.service.update-for-other';
import { PerfilPesquisadorServiceFixCpf } from './service/perfil-pesquisador.service.fix-cpf';
import { PerfilPesquisadorServiceCreate } from './service/perfil-pesquisador.service.create';
import { PerfilPesquisadorServiceCreateForOther } from './service/perfil-pesquisador.service.create-for-other';
import { PerfilPesquisadorServiceFindAll } from './service/perfil-pesquisador.service.findall';
import { PerfilPesquisadorServiceFindOne } from './service/perfil-pesquisador.service.findone';
import { PerfilPesquisadorServiceFindOneScore } from './service/perfil-pesquisador.service.findone-score';
import { PerfilPesquisadorServiceReactivate } from './service/perfil-pesquisador.service.reactivate';
import { PerfilPesquisadorServiceReactivateExpired } from './service/perfil-pesquisador.service.reactivate-expired';
import { PerfilPesquisadorServiceSuspend } from './service/perfil-pesquisador.service.suspend';
import { PerfilPesquisadorServiceUpdate } from './service/perfil-pesquisador.service.update';

@Module({
  imports: [TermoUsoModule],
  controllers: [
    PerfilPesquisadorControllerCreate,
    PerfilPesquisadorControllerFindAll,
    PerfilPesquisadorControllerFindOne,
    PerfilPesquisadorControllerUpdate,
    PerfilPesquisadorControllerUpdateForOther,
    PerfilPesquisadorControllerFixCpf,
    PerfilPesquisadorControllerSuspend,
    PerfilPesquisadorControllerReactivate,
    PerfilPesquisadorControllerCreateForOther,
  ],
  providers: [
    PerfilPesquisadorServiceCreate,
    PerfilPesquisadorServiceFindAll,
    PerfilPesquisadorServiceFindOne,
    PerfilPesquisadorServiceFindOneScore,
    PerfilPesquisadorServiceUpdate,
    PerfilPesquisadorServiceUpdateForOther,
    PerfilPesquisadorServiceFixCpf,
    PerfilPesquisadorServiceSuspend,
    PerfilPesquisadorServiceReactivate,
    PerfilPesquisadorServiceReactivateExpired,
    PerfilPesquisadorServiceCreateForOther,
  ],
})
export class PerfilPesquisadorModule {}
