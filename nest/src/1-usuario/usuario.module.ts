import { Module } from '@nestjs/common';
import { UsuarioControllerCreate } from './controllers/usuario.controller.create';
import { UsuarioControllerFindAll } from './controllers/usuario.controller.findall';
import { UsuarioControllerFindOne } from './controllers/usuario.controller.findone';
import { UsuarioControllerRemove } from './controllers/usuario.controller.remove';
import { UsuarioControllerUpdate } from './controllers/usuario.controller.update';
import { UsuarioServiceCreate } from './service/usuario.service.create';
import { UsuarioServiceFindAll } from './service/usuario.service.findall';
import { UsuarioServiceFindOne } from './service/usuario.service.findone';
import { UsuarioServiceRemove } from './service/usuario.service.remove';
import { UsuarioServiceUpdate } from './service/usuario.service.update';

@Module({
  controllers: [
    UsuarioControllerCreate,
    UsuarioControllerFindAll,
    UsuarioControllerFindOne,
    UsuarioControllerUpdate,
    UsuarioControllerRemove,
  ],
  providers: [
    UsuarioServiceCreate,
    UsuarioServiceFindAll,
    UsuarioServiceFindOne,
    UsuarioServiceUpdate,
    UsuarioServiceRemove,
  ],
})
export class UsuarioModule {}
