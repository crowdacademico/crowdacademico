import { Module } from '@nestjs/common';
import { PapelPermissaoControllerFindAll } from './controllers/papel-permissao.controller.findall';
import { PapelControllerFindAll } from './controllers/papel.controller.findall';
import { PermissaoControllerFindAll } from './controllers/permissao.controller.findall';
import { UsuarioPapelControllerCreate } from './controllers/usuario-papel.controller.create';
import { UsuarioPapelControllerFindAll } from './controllers/usuario-papel.controller.findall';
import { UsuarioPapelControllerRemove } from './controllers/usuario-papel.controller.remove';
import { PapelPermissaoServiceFindAll } from './service/papel-permissao.service.findall';
import { PapelServiceFindAll } from './service/papel.service.findall';
import { PermissaoServiceFindAll } from './service/permissao.service.findall';
import { UsuarioPapelServiceCreate } from './service/usuario-papel.service.create';
import { UsuarioPapelServiceFindAll } from './service/usuario-papel.service.findall';
import { UsuarioPapelServiceRemove } from './service/usuario-papel.service.remove';

// Não segue o padrão de 5 operações por entidade (create/findall/findone/
// update/remove) do README à risca: `papel`/`permissao`/`papel_permissao`
// só têm SELECT (sem GRANT de escrita nenhum, 06_grants.sql — catálogo de
// RBAC gerenciado direto no banco, nunca pela API, de propósito). Só
// `usuario_papel` tem escrita, e só insert/delete (não existe "editar" um
// vínculo usuário-papel, só atribuir ou remover).
@Module({
  controllers: [
    PapelControllerFindAll,
    PermissaoControllerFindAll,
    PapelPermissaoControllerFindAll,
    UsuarioPapelControllerFindAll,
    UsuarioPapelControllerCreate,
    UsuarioPapelControllerRemove,
  ],
  providers: [
    PapelServiceFindAll,
    PermissaoServiceFindAll,
    PapelPermissaoServiceFindAll,
    UsuarioPapelServiceFindAll,
    UsuarioPapelServiceCreate,
    UsuarioPapelServiceRemove,
  ],
})
export class PapelPermissaoModule {}
