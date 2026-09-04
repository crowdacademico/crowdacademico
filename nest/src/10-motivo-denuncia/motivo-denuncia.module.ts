import { Module } from '@nestjs/common';
import { MotivoDenunciaControllerCreate } from './controllers/motivo-denuncia.controller.create';
import { MotivoDenunciaControllerFindAll } from './controllers/motivo-denuncia.controller.findall';
import { MotivoDenunciaControllerFindOne } from './controllers/motivo-denuncia.controller.findone';
import { MotivoDenunciaControllerRemove } from './controllers/motivo-denuncia.controller.remove';
import { MotivoDenunciaControllerUpdate } from './controllers/motivo-denuncia.controller.update';
import { MotivoDenunciaServiceCreate } from './service/motivo-denuncia.service.create';
import { MotivoDenunciaServiceFindAll } from './service/motivo-denuncia.service.findall';
import { MotivoDenunciaServiceFindOne } from './service/motivo-denuncia.service.findone';
import { MotivoDenunciaServiceRemove } from './service/motivo-denuncia.service.remove';
import { MotivoDenunciaServiceUpdate } from './service/motivo-denuncia.service.update';

// Endpoint de remoção adicionado (18-08-2026, pedido do Lucas/Alexia) -
// 06_grants.sql [06-C-1] e 04_rls_policies.sql (pol_motivo_delete)
// passaram a conceder DELETE em motivo_denuncia pra app_nestjs, gated
// pela mesma permissão do update (motivo_denuncia_gerenciar).
// motivo_denuncia continua podendo ser referenciado por denuncia
// (FK_DENUNCIA_MOTIVO, sem CASCADE) - o service.remove traduz a
// violação de FK num 409 com mensagem própria; desativar via Alterar
// continua sendo a opção pra quando o motivo está em uso.
@Module({
  controllers: [
    MotivoDenunciaControllerCreate,
    MotivoDenunciaControllerFindAll,
    MotivoDenunciaControllerFindOne,
    MotivoDenunciaControllerRemove,
    MotivoDenunciaControllerUpdate,
  ],
  providers: [
    MotivoDenunciaServiceCreate,
    MotivoDenunciaServiceFindAll,
    MotivoDenunciaServiceFindOne,
    MotivoDenunciaServiceRemove,
    MotivoDenunciaServiceUpdate,
  ],
})
export class MotivoDenunciaModule {}
