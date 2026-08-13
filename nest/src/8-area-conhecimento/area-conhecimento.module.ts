import { Module } from '@nestjs/common';
import { AreaConhecimentoControllerCreate } from './controllers/area-conhecimento.controller.create';
import { AreaConhecimentoControllerFindAll } from './controllers/area-conhecimento.controller.findall';
import { AreaConhecimentoControllerFindOne } from './controllers/area-conhecimento.controller.findone';
import { AreaConhecimentoControllerUpdate } from './controllers/area-conhecimento.controller.update';
import { AreaConhecimentoServiceCreate } from './service/area-conhecimento.service.create';
import { AreaConhecimentoServiceFindAll } from './service/area-conhecimento.service.findall';
import { AreaConhecimentoServiceFindOne } from './service/area-conhecimento.service.findone';
import { AreaConhecimentoServiceUpdate } from './service/area-conhecimento.service.update';

// Sem endpoint de remoção: 06_grants.sql [06-C-1] só concede INSERT/UPDATE
// em area_conhecimento pra app_nestjs (nenhum DELETE) — mesmo padrão de
// motivo_denuncia/tipo_link. É proposital: área de conhecimento é
// referenciada por campanha (FK simples, sem ON DELETE CASCADE) e some do
// catálogo desativando (`ativo = false` via PATCH), nunca apagando a
// linha.
@Module({
  controllers: [
    AreaConhecimentoControllerCreate,
    AreaConhecimentoControllerFindAll,
    AreaConhecimentoControllerFindOne,
    AreaConhecimentoControllerUpdate,
  ],
  providers: [
    AreaConhecimentoServiceCreate,
    AreaConhecimentoServiceFindAll,
    AreaConhecimentoServiceFindOne,
    AreaConhecimentoServiceUpdate,
  ],
})
export class AreaConhecimentoModule {}
