import { Module } from '@nestjs/common';
import { UsuarioControllerCreate } from './controllers/usuario.controller.create';
import { UsuarioControllerDesbloquear } from './controllers/usuario.controller.desbloquear';
import { UsuarioControllerFindAll } from './controllers/usuario.controller.findall';
import { UsuarioControllerFindOne } from './controllers/usuario.controller.findone';
import { UsuarioControllerListarLogins } from './controllers/usuario.controller.listar-logins';
import { UsuarioControllerRemove } from './controllers/usuario.controller.remove';
import { UsuarioControllerUpdate } from './controllers/usuario.controller.update';
import { UsuarioServiceCreate } from './service/usuario.service.create';
import { UsuarioServiceDesbloquear } from './service/usuario.service.desbloquear';
import { UsuarioServiceFindAll } from './service/usuario.service.findall';
import { UsuarioServiceFindOne } from './service/usuario.service.findone';
import { UsuarioServiceListarLogins } from './service/usuario.service.listar-logins';
import { UsuarioServiceRemove } from './service/usuario.service.remove';
import { UsuarioServiceUpdate } from './service/usuario.service.update';

@Module({
  controllers: [
    UsuarioControllerCreate,
    UsuarioControllerFindAll,
    UsuarioControllerFindOne,
    UsuarioControllerUpdate,
    UsuarioControllerRemove,
    UsuarioControllerDesbloquear,
    UsuarioControllerListarLogins,
  ],
  providers: [
    UsuarioServiceCreate,
    UsuarioServiceFindAll,
    UsuarioServiceFindOne,
    UsuarioServiceUpdate,
    UsuarioServiceRemove,
    UsuarioServiceDesbloquear,
    UsuarioServiceListarLogins,
  ],
  // UsuarioServiceFindOne exportado pra 3-auth reaproveitar (devolver o
  // usuário público no corpo da resposta de login) em vez de duplicar a
  // mesma query/converter.
  exports: [UsuarioServiceFindOne],
})
export class UsuarioModule {}
