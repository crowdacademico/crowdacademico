import { Module } from '@nestjs/common';
import { SeguirCampanhaControllerCreate } from './controllers/seguir-campanha.controller.create';
import { SeguirCampanhaControllerFindAll } from './controllers/seguir-campanha.controller.findall';
import { SeguirCampanhaControllerRemove } from './controllers/seguir-campanha.controller.remove';
import { SeguirPesquisadorControllerCreate } from './controllers/seguir-pesquisador.controller.create';
import { SeguirPesquisadorControllerFindAll } from './controllers/seguir-pesquisador.controller.findall';
import { SeguirPesquisadorControllerRemove } from './controllers/seguir-pesquisador.controller.remove';
import { SeguirCampanhaServiceCount } from './service/seguir-campanha.service.count';
import { SeguirCampanhaServiceCreate } from './service/seguir-campanha.service.create';
import { SeguirCampanhaServiceFindAll } from './service/seguir-campanha.service.findall';
import { SeguirCampanhaServiceRemove } from './service/seguir-campanha.service.remove';
import { SeguirPesquisadorServiceCount } from './service/seguir-pesquisador.service.count';
import { SeguirPesquisadorServiceCreate } from './service/seguir-pesquisador.service.create';
import { SeguirPesquisadorServiceFindAll } from './service/seguir-pesquisador.service.findall';
import { SeguirPesquisadorServiceRemove } from './service/seguir-pesquisador.service.remove';

// Seguir uma campanha (RF-010, RF-011) e seguir um pesquisador (RF-028): duas tabelas, as mesmas regras (não segue
// duas vezes, só a própria conta vê a própria lista). Os avisos por e-mail a quem segue nascem no banco ([05-Q]).
@Module({
  controllers: [
    SeguirCampanhaControllerCreate,
    SeguirCampanhaControllerFindAll,
    SeguirCampanhaControllerRemove,
    SeguirPesquisadorControllerCreate,
    SeguirPesquisadorControllerFindAll,
    SeguirPesquisadorControllerRemove,
  ],
  providers: [
    SeguirCampanhaServiceCreate,
    SeguirCampanhaServiceFindAll,
    SeguirCampanhaServiceRemove,
    SeguirCampanhaServiceCount,
    SeguirPesquisadorServiceCreate,
    SeguirPesquisadorServiceFindAll,
    SeguirPesquisadorServiceRemove,
    SeguirPesquisadorServiceCount,
  ],
})
export class SeguirModule {}
