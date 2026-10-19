import { Module } from '@nestjs/common';
import { ArquivoControllerAvatar } from './controllers/arquivo.controller.avatar';
import { ArquivoControllerConfirmUpload } from './controllers/arquivo.controller.confirm-upload';
import { ArquivoControllerFindOne } from './controllers/arquivo.controller.findone';
import { ArquivoControllerStartUpload } from './controllers/arquivo.controller.start-upload';
import { ArquivoControllerRemove } from './controllers/arquivo.controller.remove';
import { ArquivoServiceConfirmUpload } from './service/arquivo.service.confirm-upload';
import { ArquivoServiceFindOne } from './service/arquivo.service.findone';
import { ArquivoServiceStartUpload } from './service/arquivo.service.start-upload';
import { ArquivoServiceCleanOrphans } from './service/arquivo.service.clean-orphans';
import { ArquivoServiceRemove } from './service/arquivo.service.remove';
import { ArquivoServiceResolveAvatar } from './service/arquivo.service.resolve-avatar';

// StorageModule NÃO é importado aqui de propósito: é @Global() (ver commons/storage/storage.module.ts),
// registrado uma vez em app.module.ts, mesmo padrão de DatabaseModule/DatabaseService usado nos outros módulos.
//
// ArquivoServiceResolveAvatar e ArquivoServiceRemove saem em `exports`: ArquivoServiceResolveAvatar para
// 1-usuario (ou outro módulo) injetar direto e incluir a URL do avatar já resolvida na própria resposta, sem
// duplicar a regra de fallback; ArquivoServiceRemove para UsuarioServiceUpdate poder desativar a foto ANTERIOR
// quando a pessoa troca de foto (sem isso, cada troca deixaria a foto antiga órfã: ativa no banco, ocupando
// espaço no bucket para sempre).
@Module({
  controllers: [
    ArquivoControllerStartUpload,
    ArquivoControllerConfirmUpload,
    ArquivoControllerFindOne,
    ArquivoControllerRemove,
    ArquivoControllerAvatar,
  ],
  providers: [
    ArquivoServiceStartUpload,
    ArquivoServiceConfirmUpload,
    ArquivoServiceFindOne,
    ArquivoServiceRemove,
    ArquivoServiceResolveAvatar,
    ArquivoServiceCleanOrphans,
  ],
  exports: [ArquivoServiceResolveAvatar, ArquivoServiceRemove],
})
export class ArquivoModule {}
