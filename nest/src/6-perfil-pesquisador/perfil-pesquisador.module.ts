import { Module } from '@nestjs/common';
import { PerfilPesquisadorControllerCorrigirCpf } from './controllers/perfil-pesquisador.controller.corrigir-cpf';
import { PerfilPesquisadorControllerCreate } from './controllers/perfil-pesquisador.controller.create';
import { PerfilPesquisadorControllerCreateParaOutro } from './controllers/perfil-pesquisador.controller.create-para-outro';
import { PerfilPesquisadorControllerFindAll } from './controllers/perfil-pesquisador.controller.findall';
import { PerfilPesquisadorControllerFindOne } from './controllers/perfil-pesquisador.controller.findone';
import { PerfilPesquisadorControllerReativar } from './controllers/perfil-pesquisador.controller.reativar';
import { PerfilPesquisadorControllerSuspender } from './controllers/perfil-pesquisador.controller.suspender';
import { PerfilPesquisadorControllerUpdate } from './controllers/perfil-pesquisador.controller.update';
import { PerfilPesquisadorServiceCorrigirCpf } from './service/perfil-pesquisador.service.corrigir-cpf';
import { PerfilPesquisadorServiceCreate } from './service/perfil-pesquisador.service.create';
import { PerfilPesquisadorServiceCreateParaOutro } from './service/perfil-pesquisador.service.create-para-outro';
import { PerfilPesquisadorServiceFindAll } from './service/perfil-pesquisador.service.findall';
import { PerfilPesquisadorServiceFindOne } from './service/perfil-pesquisador.service.findone';
import { PerfilPesquisadorServiceFindOneScore } from './service/perfil-pesquisador.service.findone-score';
import { PerfilPesquisadorServiceReativar } from './service/perfil-pesquisador.service.reativar';
import { PerfilPesquisadorServiceReativarVencidos } from './service/perfil-pesquisador.service.reativar-vencidos';
import { PerfilPesquisadorServiceSuspender } from './service/perfil-pesquisador.service.suspender';
import { PerfilPesquisadorServiceUpdate } from './service/perfil-pesquisador.service.update';

@Module({
  controllers: [
    PerfilPesquisadorControllerCreate,
    PerfilPesquisadorControllerFindAll,
    PerfilPesquisadorControllerFindOne,
    PerfilPesquisadorControllerUpdate,
    PerfilPesquisadorControllerCorrigirCpf,
    PerfilPesquisadorControllerSuspender,
    PerfilPesquisadorControllerReativar,
    PerfilPesquisadorControllerCreateParaOutro,
  ],
  providers: [
    PerfilPesquisadorServiceCreate,
    PerfilPesquisadorServiceFindAll,
    PerfilPesquisadorServiceFindOne,
    PerfilPesquisadorServiceFindOneScore,
    PerfilPesquisadorServiceUpdate,
    PerfilPesquisadorServiceCorrigirCpf,
    PerfilPesquisadorServiceSuspender,
    PerfilPesquisadorServiceReativar,
    PerfilPesquisadorServiceReativarVencidos,
    PerfilPesquisadorServiceCreateParaOutro,
  ],
})
export class PerfilPesquisadorModule {}
