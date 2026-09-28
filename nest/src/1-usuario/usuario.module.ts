import { Module } from '@nestjs/common';
import { ArquivoModule } from '../25-arquivo/arquivo.module';
import { UsuarioControllerCreate } from './controllers/usuario.controller.create';
import { UsuarioControllerUnlock } from './controllers/usuario.controller.unlock';
import { UsuarioControllerExportData } from './controllers/usuario.controller.export-data';
import { UsuarioControllerFindAll } from './controllers/usuario.controller.findall';
import { UsuarioControllerFindOne } from './controllers/usuario.controller.findone';
import { UsuarioControllerFindAllLogins } from './controllers/usuario.controller.findall-logins';
import { UsuarioControllerFindAllAcceptedTerms } from './controllers/usuario.controller.findall-accepted-terms';
import { UsuarioControllerRemove } from './controllers/usuario.controller.remove';
import { UsuarioControllerSuspend } from './controllers/usuario.controller.suspend';
import { UsuarioControllerUpdate } from './controllers/usuario.controller.update';
import { UsuarioGuardExportDataThrottler } from './guards/usuario.guard.export-data-throttler';
import { UsuarioServiceCreate } from './service/usuario.service.create';
import { UsuarioServiceUnlock } from './service/usuario.service.unlock';
import { UsuarioServiceExportData } from './service/usuario.service.export-data';
import { UsuarioServiceFindAll } from './service/usuario.service.findall';
import { UsuarioServiceFindOne } from './service/usuario.service.findone';
import { UsuarioServiceFindAllLogins } from './service/usuario.service.findall-logins';
import { UsuarioServiceFindAllAcceptedTerms } from './service/usuario.service.findall-accepted-terms';
import { UsuarioServiceRemove } from './service/usuario.service.remove';
import { UsuarioServiceSuspend } from './service/usuario.service.suspend';
import { UsuarioServiceUpdate } from './service/usuario.service.update';

@Module({
  // ArquivoModule importado só pra ArquivoServiceRemove (limpeza da foto
  // de perfil ANTERIOR quando a pessoa troca - ver usuario.service.update.ts).
  // Sem ciclo: ArquivoModule não importa UsuarioModule de volta.
  imports: [ArquivoModule],
  controllers: [
    UsuarioControllerCreate,
    UsuarioControllerFindAll,
    UsuarioControllerFindOne,
    UsuarioControllerUpdate,
    UsuarioControllerRemove,
    UsuarioControllerUnlock,
    UsuarioControllerFindAllLogins,
    UsuarioControllerFindAllAcceptedTerms,
    UsuarioControllerSuspend,
    UsuarioControllerExportData,
  ],
  providers: [
    UsuarioServiceCreate,
    UsuarioServiceFindAll,
    UsuarioServiceFindOne,
    UsuarioServiceUpdate,
    UsuarioServiceRemove,
    UsuarioServiceUnlock,
    UsuarioServiceFindAllLogins,
    UsuarioServiceFindAllAcceptedTerms,
    UsuarioServiceSuspend,
    UsuarioServiceExportData,
    UsuarioGuardExportDataThrottler,
  ],
  // UsuarioServiceFindOne exportado para 3-auth reaproveitar (devolver o usuário público no corpo da resposta
  // de login) em vez de duplicar a mesma query/converter. UsuarioServiceCreate exportado pelo mesmo motivo:
  // POST /auth/cadastro (self-registro público) reaproveita a MESMA criação de usuário que POST /usuario
  // (admin), em vez de duplicar bcrypt.hash + INSERT + atribuir_papel_padrao() num segundo lugar.
  exports: [UsuarioServiceFindOne, UsuarioServiceCreate],
})
export class UsuarioModule {}
