import { Module } from '@nestjs/common';
import { AreaConhecimentoControllerCreate } from './controllers/area-conhecimento.controller.create';
import { AreaConhecimentoControllerFindAll } from './controllers/area-conhecimento.controller.findall';
import { AreaConhecimentoControllerFindOne } from './controllers/area-conhecimento.controller.findone';
import { AreaConhecimentoControllerRemove } from './controllers/area-conhecimento.controller.remove';
import { AreaConhecimentoControllerUpdate } from './controllers/area-conhecimento.controller.update';
import { AreaConhecimentoServiceCreate } from './service/area-conhecimento.service.create';
import { AreaConhecimentoServiceFindAll } from './service/area-conhecimento.service.findall';
import { AreaConhecimentoServiceFindOne } from './service/area-conhecimento.service.findone';
import { AreaConhecimentoServiceRemove } from './service/area-conhecimento.service.remove';
import { AreaConhecimentoServiceUpdate } from './service/area-conhecimento.service.update';

// Endpoint de remoção adicionado (18-08-2026, pedido do Lucas/Alexia) -
// 06_grants.sql [06-C-1] e 04_rls_policies.sql (pol_area_delete) passaram
// a conceder DELETE em area_conhecimento pra app_nestjs, gated pela mesma
// permissão do update (area_conhecimento_gerenciar). Área de conhecimento
// continua podendo ser referenciada por campanha (FK simples, sem
// CASCADE) - o service.remove traduz a violação de FK num 409 com
// mensagem própria em vez de deixar vazar o 400 genérico do filtro
// global; desativar via Alterar continua sendo a opção pra quando a área
// está em uso.
@Module({
  controllers: [
    AreaConhecimentoControllerCreate,
    AreaConhecimentoControllerFindAll,
    AreaConhecimentoControllerFindOne,
    AreaConhecimentoControllerRemove,
    AreaConhecimentoControllerUpdate,
  ],
  providers: [
    AreaConhecimentoServiceCreate,
    AreaConhecimentoServiceFindAll,
    AreaConhecimentoServiceFindOne,
    AreaConhecimentoServiceRemove,
    AreaConhecimentoServiceUpdate,
  ],
})
export class AreaConhecimentoModule {}
