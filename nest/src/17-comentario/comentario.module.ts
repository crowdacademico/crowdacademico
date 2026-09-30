import { Module } from '@nestjs/common';
import { ComentarioControllerCreate } from './controllers/comentario.controller.create';
import { ComentarioControllerFindAll } from './controllers/comentario.controller.findall';
import { ComentarioControllerRemove } from './controllers/comentario.controller.remove';
import { ComentarioControllerUpdate } from './controllers/comentario.controller.update';
import { ComentarioServiceCreate } from './service/comentario.service.create';
import { ComentarioServiceFindAll } from './service/comentario.service.findall';
import { ComentarioServiceRemove } from './service/comentario.service.remove';
import { ComentarioServiceUpdate } from './service/comentario.service.update';

@Module({
  controllers: [
    ComentarioControllerCreate,
    ComentarioControllerFindAll,
    ComentarioControllerUpdate,
    ComentarioControllerRemove,
  ],
  providers: [
    ComentarioServiceCreate,
    ComentarioServiceFindAll,
    ComentarioServiceUpdate,
    ComentarioServiceRemove,
  ],
})
export class ComentarioModule {}
