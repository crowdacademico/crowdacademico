import { Module } from '@nestjs/common';
import { TermoUsoModule } from '../5-termo-uso/termo-uso.module';
import { PerfilPesquisadorControllerAlterarDeOutro } from './controllers/perfil-pesquisador.controller.update-for-other';
import { PerfilPesquisadorControllerCorrigirCpf } from './controllers/perfil-pesquisador.controller.fix-cpf';
import { PerfilPesquisadorControllerCreate } from './controllers/perfil-pesquisador.controller.create';
import { PerfilPesquisadorControllerCreateParaOutro } from './controllers/perfil-pesquisador.controller.create-for-other';
import { PerfilPesquisadorControllerFindAll } from './controllers/perfil-pesquisador.controller.findall';
import { PerfilPesquisadorControllerFindOne } from './controllers/perfil-pesquisador.controller.findone';
import { PerfilPesquisadorControllerReativar } from './controllers/perfil-pesquisador.controller.reactivate';
import { PerfilPesquisadorControllerSuspender } from './controllers/perfil-pesquisador.controller.suspend';
import { PerfilPesquisadorControllerUpdate } from './controllers/perfil-pesquisador.controller.update';
import { PerfilPesquisadorServiceAlterarDeOutro } from './service/perfil-pesquisador.service.update-for-other';
import { PerfilPesquisadorServiceCorrigirCpf } from './service/perfil-pesquisador.service.fix-cpf';
import { PerfilPesquisadorServiceCreate } from './service/perfil-pesquisador.service.create';
import { PerfilPesquisadorServiceCreateParaOutro } from './service/perfil-pesquisador.service.create-for-other';
import { PerfilPesquisadorServiceFindAll } from './service/perfil-pesquisador.service.findall';
import { PerfilPesquisadorServiceFindOne } from './service/perfil-pesquisador.service.findone';
import { PerfilPesquisadorServiceFindOneScore } from './service/perfil-pesquisador.service.findone-score';
import { PerfilPesquisadorServiceReativar } from './service/perfil-pesquisador.service.reactivate';
import { PerfilPesquisadorServiceReativarVencidos } from './service/perfil-pesquisador.service.reactivate-expired';
import { PerfilPesquisadorServiceSuspender } from './service/perfil-pesquisador.service.suspend';
import { PerfilPesquisadorServiceUpdate } from './service/perfil-pesquisador.service.update';

@Module({
  imports: [TermoUsoModule],
  controllers: [
    PerfilPesquisadorControllerCreate,
    PerfilPesquisadorControllerFindAll,
    PerfilPesquisadorControllerFindOne,
    PerfilPesquisadorControllerUpdate,
    PerfilPesquisadorControllerAlterarDeOutro,
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
    PerfilPesquisadorServiceAlterarDeOutro,
    PerfilPesquisadorServiceCorrigirCpf,
    PerfilPesquisadorServiceSuspender,
    PerfilPesquisadorServiceReativar,
    PerfilPesquisadorServiceReativarVencidos,
    PerfilPesquisadorServiceCreateParaOutro,
  ],
})
export class PerfilPesquisadorModule {}
