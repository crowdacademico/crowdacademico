import { Module } from '@nestjs/common';
import { TipoLinkControllerCreate } from './controllers/tipo-link.controller.create';
import { TipoLinkControllerFindAll } from './controllers/tipo-link.controller.findall';
import { TipoLinkControllerFindOne } from './controllers/tipo-link.controller.findone';
import { TipoLinkControllerUpdate } from './controllers/tipo-link.controller.update';
import { TipoLinkServiceCreate } from './service/tipo-link.service.create';
import { TipoLinkServiceFindAll } from './service/tipo-link.service.findall';
import { TipoLinkServiceFindOne } from './service/tipo-link.service.findone';
import { TipoLinkServiceUpdate } from './service/tipo-link.service.update';

// Sem endpoint de remoção: 06_grants.sql [06-C-2] só concede INSERT/UPDATE
// em tipo_link pra app_nestjs (nenhum DELETE) — mesmo padrão de
// area_conhecimento/motivo_denuncia. Proposital: tipo_link é referenciado
// por link_academico/link_atualizacao/link_recompensa (FK simples, sem
// CASCADE) e some do catálogo desativando (`ativo = false` via PATCH),
// nunca apagando a linha.
@Module({
  controllers: [
    TipoLinkControllerCreate,
    TipoLinkControllerFindAll,
    TipoLinkControllerFindOne,
    TipoLinkControllerUpdate,
  ],
  providers: [
    TipoLinkServiceCreate,
    TipoLinkServiceFindAll,
    TipoLinkServiceFindOne,
    TipoLinkServiceUpdate,
  ],
})
export class TipoLinkModule {}
