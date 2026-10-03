import { Module } from '@nestjs/common';
import { ComentarioControllerCreate } from './controllers/comentario.controller.create';
import { ComentarioControllerCreateForOther } from './controllers/comentario.controller.create-for-other';
import { ComentarioControllerFindAll } from './controllers/comentario.controller.findall';
import { ComentarioControllerRemove } from './controllers/comentario.controller.remove';
import { ComentarioControllerUpdate } from './controllers/comentario.controller.update';
import { ComentarioServiceCreate } from './service/comentario.service.create';
import { ComentarioServiceCreateForOther } from './service/comentario.service.create-for-other';
import { ComentarioServiceFindAll } from './service/comentario.service.findall';
import { ComentarioServiceRemove } from './service/comentario.service.remove';
import { ComentarioServiceUpdate } from './service/comentario.service.update';

@Module({
  controllers: [
    ComentarioControllerCreate,
    ComentarioControllerCreateForOther,
    ComentarioControllerFindAll,
    ComentarioControllerUpdate,
    ComentarioControllerRemove,
  ],
  providers: [
    ComentarioServiceCreate,
    ComentarioServiceCreateForOther,
    ComentarioServiceFindAll,
    ComentarioServiceUpdate,
    ComentarioServiceRemove,
  ],
})
export class ComentarioModule {}
