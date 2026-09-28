import { Module } from '@nestjs/common';
import { PapelPermissaoControllerCreate } from './controllers/papel-permissao.controller.create';
import { PapelPermissaoControllerFindAll } from './controllers/papel-permissao.controller.findall';
import { PapelPermissaoControllerRemove } from './controllers/papel-permissao.controller.remove';
import { PapelControllerFindAll } from './controllers/papel.controller.findall';
import { PapelControllerUpdate } from './controllers/papel.controller.update';
import { PermissaoControllerFindAll } from './controllers/permissao.controller.findall';
import { UsuarioPapelControllerCreate } from './controllers/usuario-papel.controller.create';
import { UsuarioPapelControllerFindAll } from './controllers/usuario-papel.controller.findall';
import { UsuarioPapelControllerFindAllGlobal } from './controllers/usuario-papel.controller.findall-global';
import { UsuarioPapelControllerRemove } from './controllers/usuario-papel.controller.remove';
import { UsuarioPapelControllerSuspend } from './controllers/usuario-papel.controller.suspend';
import { PapelPermissaoServiceCreate } from './service/papel-permissao.service.create';
import { PapelPermissaoServiceFindAll } from './service/papel-permissao.service.findall';
import { PapelPermissaoServiceRemove } from './service/papel-permissao.service.remove';
import { PapelServiceFindAll } from './service/papel.service.findall';
import { PapelServiceUpdate } from './service/papel.service.update';
import { PermissaoServiceFindAll } from './service/permissao.service.findall';
import { UsuarioPapelServiceCreate } from './service/usuario-papel.service.create';
import { UsuarioPapelServiceFindAll } from './service/usuario-papel.service.findall';
import { UsuarioPapelServiceFindAllGlobal } from './service/usuario-papel.service.findall-global';
import { UsuarioPapelServiceRemove } from './service/usuario-papel.service.remove';
import { UsuarioPapelServiceSuspend } from './service/usuario-papel.service.suspend';

// `papel`/`permissao` são quase todo só-leitura (catálogo gerenciado via seed/migração direta, de propósito:
// CRIAR um papel ou permissão nova é decisão maior). `papel_permissao` tem insert/delete: o admin
// concede/revoga permissão de um papel já existente pelo Painel Admin, sem acessar o banco (ver [04-B-1] em
// 04_rls_policies.sql). Mesmo padrão de `usuario_papel`: só insert/delete, não existe "editar" um vínculo, só
// atribuir ou remover.
//
// `papel` tem UPDATE só de `nome`: renomear um papel já existente (ex.: 'admin' → 'Administrador') é seguro
// porque `papel.codigo` existe (01_extensoes_enums_tabelas.sql [01-B]) e as triggers de RBAC leem `codigo`,
// nunca `nome`. `permissao` continua sem nenhum caminho de escrita: renomear uma permissão exigiria também
// atualizar qualquer lugar que a referencie por nome (não é o caso de `papel`, cujas 3 dependências por nome
// foram todas movidas para `codigo`).
@Module({
  controllers: [
    PapelControllerFindAll,
    PapelControllerUpdate,
    PermissaoControllerFindAll,
    PapelPermissaoControllerFindAll,
    PapelPermissaoControllerCreate,
    PapelPermissaoControllerRemove,
    UsuarioPapelControllerFindAll,
    UsuarioPapelControllerFindAllGlobal,
    UsuarioPapelControllerCreate,
    UsuarioPapelControllerRemove,
    UsuarioPapelControllerSuspend,
  ],
  providers: [
    PapelServiceFindAll,
    PapelServiceUpdate,
    PermissaoServiceFindAll,
    PapelPermissaoServiceFindAll,
    PapelPermissaoServiceCreate,
    PapelPermissaoServiceRemove,
    UsuarioPapelServiceFindAll,
    UsuarioPapelServiceFindAllGlobal,
    UsuarioPapelServiceCreate,
    UsuarioPapelServiceRemove,
    UsuarioPapelServiceSuspend,
  ],
})
export class PapelPermissaoModule {}
