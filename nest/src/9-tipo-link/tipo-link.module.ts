import { Module } from '@nestjs/common';
import { TipoLinkControllerCreate } from './controllers/tipo-link.controller.create';
import { TipoLinkControllerFindAll } from './controllers/tipo-link.controller.findall';
import { TipoLinkControllerFindOne } from './controllers/tipo-link.controller.findone';
import { TipoLinkControllerRemove } from './controllers/tipo-link.controller.remove';
import { TipoLinkControllerUpdate } from './controllers/tipo-link.controller.update';
import { TipoLinkServiceCreate } from './service/tipo-link.service.create';
import { TipoLinkServiceFindAll } from './service/tipo-link.service.findall';
import { TipoLinkServiceFindOne } from './service/tipo-link.service.findone';
import { TipoLinkServiceRemove } from './service/tipo-link.service.remove';
import { TipoLinkServiceUpdate } from './service/tipo-link.service.update';

// Endpoint de remoção adicionado (18-08-2026, pedido do Lucas/Alexia) -
// 06_grants.sql [06-C-2] e 04_rls_policies.sql (pol_tipolink_delete)
// passaram a conceder DELETE em tipo_link pra app_nestjs, gated pela
// mesma permissão do update (tipolink_gerenciar). tipo_link continua
// podendo ser referenciado por link_academico/link_atualizacao/
// link_recompensa (FK simples, sem CASCADE) - o service.remove traduz a
// violação de FK num 409 com mensagem própria; desativar via Alterar
// continua sendo a opção pra quando o tipo está em uso.
@Module({
  controllers: [
    TipoLinkControllerCreate,
    TipoLinkControllerFindAll,
    TipoLinkControllerFindOne,
    TipoLinkControllerRemove,
    TipoLinkControllerUpdate,
  ],
  providers: [
    TipoLinkServiceCreate,
    TipoLinkServiceFindAll,
    TipoLinkServiceFindOne,
    TipoLinkServiceRemove,
    TipoLinkServiceUpdate,
  ],
})
export class TipoLinkModule {}
