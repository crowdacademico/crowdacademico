import { Module } from '@nestjs/common';
import { RecompensaControllerCreate } from './controllers/recompensa.controller.create';
import { RecompensaControllerFindAll } from './controllers/recompensa.controller.findall';
import { RecompensaControllerUpdate } from './controllers/recompensa.controller.update';
import { RecompensaServiceCreate } from './service/recompensa.service.create';
import { RecompensaServiceFindAll } from './service/recompensa.service.findall';
import { RecompensaServiceLink } from './service/recompensa.service.link';
import { RecompensaServiceMine } from './service/recompensa.service.mine';
import { RecompensaServiceUpdate } from './service/recompensa.service.update';

// Recompensa simbólica (RF-099 a RF-101): nome de quem apoiou no projeto, acesso antecipado, um link especial. Sem
// estoque e sem entrega. Um módulo para recompensa e link_recompensa (o satélite, como em 15-atualizacao-campanha);
// a escolha da recompensa numa contribuição grava em contribuicao_recompensa, pelo POST /contribuicao (22).
@Module({
  controllers: [
    RecompensaControllerFindAll,
    RecompensaControllerCreate,
    RecompensaControllerUpdate,
  ],
  providers: [
    RecompensaServiceFindAll,
    RecompensaServiceCreate,
    RecompensaServiceUpdate,
    RecompensaServiceLink,
    RecompensaServiceMine,
  ],
})
export class RecompensaModule {}
