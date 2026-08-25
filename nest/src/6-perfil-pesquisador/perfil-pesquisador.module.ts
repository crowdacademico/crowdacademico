import { Module } from '@nestjs/common';
import { PerfilPesquisadorControllerCreate } from './controllers/perfil-pesquisador.controller.create';
import { PerfilPesquisadorControllerFindAll } from './controllers/perfil-pesquisador.controller.findall';
import { PerfilPesquisadorControllerFindOne } from './controllers/perfil-pesquisador.controller.findone';
import { PerfilPesquisadorControllerUpdate } from './controllers/perfil-pesquisador.controller.update';
import { PerfilPesquisadorServiceCreate } from './service/perfil-pesquisador.service.create';
import { PerfilPesquisadorServiceFindAll } from './service/perfil-pesquisador.service.findall';
import { PerfilPesquisadorServiceFindOne } from './service/perfil-pesquisador.service.findone';
import { PerfilPesquisadorServiceFindOneScore } from './service/perfil-pesquisador.service.findone-score';
import { PerfilPesquisadorServiceUpdate } from './service/perfil-pesquisador.service.update';

@Module({
  controllers: [
    PerfilPesquisadorControllerCreate,
    PerfilPesquisadorControllerFindAll,
    PerfilPesquisadorControllerFindOne,
    PerfilPesquisadorControllerUpdate,
  ],
  providers: [
    PerfilPesquisadorServiceCreate,
    PerfilPesquisadorServiceFindAll,
    PerfilPesquisadorServiceFindOne,
    PerfilPesquisadorServiceFindOneScore,
    PerfilPesquisadorServiceUpdate,
  ],
})
export class PerfilPesquisadorModule {}
