import { Module } from '@nestjs/common';
import { ArquivoControllerAvatar } from './controllers/arquivo.controller.avatar';
import { ArquivoControllerConfirmarUpload } from './controllers/arquivo.controller.confirmar-upload';
import { ArquivoControllerFindOne } from './controllers/arquivo.controller.findone';
import { ArquivoControllerIniciarUpload } from './controllers/arquivo.controller.iniciar-upload';
import { ArquivoControllerRemove } from './controllers/arquivo.controller.remove';
import { ArquivoServiceConfirmarUpload } from './service/arquivo.service.confirmar-upload';
import { ArquivoServiceFindOne } from './service/arquivo.service.findone';
import { ArquivoServiceIniciarUpload } from './service/arquivo.service.iniciar-upload';
import { ArquivoServiceRemove } from './service/arquivo.service.remove';
import { ArquivoServiceResolverAvatar } from './service/arquivo.service.resolver-avatar';

// StorageModule NÃO é importado aqui de propósito — é @Global() (ver
// commons/storage/storage.module.ts), registrado uma vez em app.module.ts,
// mesmo padrão de DatabaseModule/DatabaseService já usado em todos os
// outros módulos deste projeto.
//
// ArquivoServiceResolverAvatar sai em `exports` — pensado pra 1-usuario
// (ou outro módulo futuro) poder injetar direto e incluir a URL do avatar
// já resolvida na própria resposta, sem duplicar a regra de fallback.
@Module({
  controllers: [
    ArquivoControllerIniciarUpload,
    ArquivoControllerConfirmarUpload,
    ArquivoControllerFindOne,
    ArquivoControllerRemove,
    ArquivoControllerAvatar,
  ],
  providers: [
    ArquivoServiceIniciarUpload,
    ArquivoServiceConfirmarUpload,
    ArquivoServiceFindOne,
    ArquivoServiceRemove,
    ArquivoServiceResolverAvatar,
  ],
  exports: [ArquivoServiceResolverAvatar],
})
export class ArquivoModule {}
