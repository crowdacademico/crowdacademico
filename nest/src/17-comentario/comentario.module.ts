import { Module } from '@nestjs/common';
import { ComentarioControllerCreate } from './controllers/comentario.controller.create';
import { ComentarioControllerFindAll } from './controllers/comentario.controller.findall';
import { ComentarioControllerUpdate } from './controllers/comentario.controller.update';
import { ComentarioServiceCreate } from './service/comentario.service.create';
import { ComentarioServiceFindAll } from './service/comentario.service.findall';
import { ComentarioServiceUpdate } from './service/comentario.service.update';

@Module({
  controllers: [
    ComentarioControllerCreate,
    ComentarioControllerFindAll,
    ComentarioControllerUpdate,
  ],
  providers: [
    ComentarioServiceCreate,
    ComentarioServiceFindAll,
    ComentarioServiceUpdate,
  ],
})
export class ComentarioModule {}
