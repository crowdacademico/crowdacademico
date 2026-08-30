import { Module } from '@nestjs/common';
import { ArquivoModule } from '../25-arquivo/arquivo.module';
import { UsuarioControllerCreate } from './controllers/usuario.controller.create';
import { UsuarioControllerDesbloquear } from './controllers/usuario.controller.desbloquear';
import { UsuarioControllerFindAll } from './controllers/usuario.controller.findall';
import { UsuarioControllerFindOne } from './controllers/usuario.controller.findone';
import { UsuarioControllerListarLogins } from './controllers/usuario.controller.listar-logins';
import { UsuarioControllerRemove } from './controllers/usuario.controller.remove';
import { UsuarioControllerSuspender } from './controllers/usuario.controller.suspender';
import { UsuarioControllerUpdate } from './controllers/usuario.controller.update';
import { UsuarioServiceCreate } from './service/usuario.service.create';
import { UsuarioServiceDesbloquear } from './service/usuario.service.desbloquear';
import { UsuarioServiceFindAll } from './service/usuario.service.findall';
import { UsuarioServiceFindOne } from './service/usuario.service.findone';
import { UsuarioServiceListarLogins } from './service/usuario.service.listar-logins';
import { UsuarioServiceRemove } from './service/usuario.service.remove';
import { UsuarioServiceSuspender } from './service/usuario.service.suspender';
import { UsuarioServiceUpdate } from './service/usuario.service.update';

@Module({
  // ArquivoModule importado só pra ArquivoServiceRemove (limpeza da foto
  // de perfil ANTERIOR quando a pessoa troca — ver usuario.service.update.ts).
  // Sem ciclo: ArquivoModule não importa UsuarioModule de volta.
  imports: [ArquivoModule],
  controllers: [
    UsuarioControllerCreate,
    UsuarioControllerFindAll,
    UsuarioControllerFindOne,
    UsuarioControllerUpdate,
    UsuarioControllerRemove,
    UsuarioControllerDesbloquear,
    UsuarioControllerListarLogins,
    UsuarioControllerSuspender,
  ],
  providers: [
    UsuarioServiceCreate,
    UsuarioServiceFindAll,
    UsuarioServiceFindOne,
    UsuarioServiceUpdate,
    UsuarioServiceRemove,
    UsuarioServiceDesbloquear,
    UsuarioServiceListarLogins,
    UsuarioServiceSuspender,
  ],
  // UsuarioServiceFindOne exportado pra 3-auth reaproveitar (devolver o
  // usuário público no corpo da resposta de login) em vez de duplicar a
  // mesma query/converter. UsuarioServiceCreate exportado (09-08-2026) pelo
  // mesmo motivo: POST /auth/cadastro (self-registro público, Bloco D do
  // prompt do Claude Web) reaproveita a MESMA criação de usuário que
  // POST /usuario (admin) já usa, em vez de duplicar bcrypt.hash + INSERT +
  // atribuir_papel_padrao() num segundo lugar.
  exports: [UsuarioServiceFindOne, UsuarioServiceCreate],
})
export class UsuarioModule {}