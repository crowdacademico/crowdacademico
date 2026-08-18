import { Module } from '@nestjs/common';
import { MotivoDenunciaControllerCreate } from './controllers/motivo-denuncia.controller.create';
import { MotivoDenunciaControllerFindAll } from './controllers/motivo-denuncia.controller.findall';
import { MotivoDenunciaControllerFindOne } from './controllers/motivo-denuncia.controller.findone';
import { MotivoDenunciaControllerUpdate } from './controllers/motivo-denuncia.controller.update';
import { MotivoDenunciaServiceCreate } from './service/motivo-denuncia.service.create';
import { MotivoDenunciaServiceFindAll } from './service/motivo-denuncia.service.findall';
import { MotivoDenunciaServiceFindOne } from './service/motivo-denuncia.service.findone';
import { MotivoDenunciaServiceUpdate } from './service/motivo-denuncia.service.update';

// Sem endpoint de remoção: 06_grants.sql [06-C-1] só concede INSERT/UPDATE
// em area_conhecimento/motivo_denuncia pra app_nestjs (nenhum DELETE) —
// mesmo padrão de tipo_link (9-tipo-link). Proposital: motivo_denuncia é
// referenciado por denuncia (FK_DENUNCIA_MOTIVO, sem CASCADE) e some do
// catálogo desativando (`ativo = false` via PATCH), nunca apagando a
// linha.
@Module({
  controllers: [
    MotivoDenunciaControllerCreate,
    MotivoDenunciaControllerFindAll,
    MotivoDenunciaControllerFindOne,
    MotivoDenunciaControllerUpdate,
  ],
  providers: [
    MotivoDenunciaServiceCreate,
    MotivoDenunciaServiceFindAll,
    MotivoDenunciaServiceFindOne,
    MotivoDenunciaServiceUpdate,
  ],
})
export class MotivoDenunciaModule {}
