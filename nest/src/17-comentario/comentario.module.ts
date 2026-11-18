import { Module } from '@nestjs/common';
import { ComentarioControllerCreate } from './controllers/comentario.controller.create';
import { ComentarioControllerFindAll } from './controllers/comentario.controller.findall';
import { ComentarioControllerFindAllModeracao } from './controllers/comentario.controller.findall-moderacao';
import { ComentarioControllerRemove } from './controllers/comentario.controller.remove';
import { ComentarioControllerUpdate } from './controllers/comentario.controller.update';
import { ComentarioServiceCreate } from './service/comentario.service.create';
import { ComentarioServiceFindAll } from './service/comentario.service.findall';
import { ComentarioServiceFindAllModeracao } from './service/comentario.service.findall-moderacao';
import { ComentarioServiceRemove } from './service/comentario.service.remove';
import { ComentarioServiceUpdate } from './service/comentario.service.update';

@Module({
  controllers: [
    ComentarioControllerCreate,
    // GET /comentario/moderacao: a tela Comentários da moderação (18-11-2026).
    ComentarioControllerFindAllModeracao,
    ComentarioControllerFindAll,
    ComentarioControllerUpdate,
    ComentarioControllerRemove,
  ],
  providers: [
    ComentarioServiceCreate,
    ComentarioServiceFindAll,
    ComentarioServiceFindAllModeracao,
    ComentarioServiceUpdate,
    ComentarioServiceRemove,
  ],
})
export class ComentarioModule {}
