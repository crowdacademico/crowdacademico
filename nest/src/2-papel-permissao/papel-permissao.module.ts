import { Module } from '@nestjs/common';
import { PapelPermissaoControllerCreate } from './controllers/papel-permissao.controller.create';
import { PapelPermissaoControllerFindAll } from './controllers/papel-permissao.controller.findall';
import { PapelPermissaoControllerRemove } from './controllers/papel-permissao.controller.remove';
import { PapelControllerFindAll } from './controllers/papel.controller.findall';
import { PermissaoControllerFindAll } from './controllers/permissao.controller.findall';
import { UsuarioPapelControllerCreate } from './controllers/usuario-papel.controller.create';
import { UsuarioPapelControllerFindAll } from './controllers/usuario-papel.controller.findall';
import { UsuarioPapelControllerFindAllGeral } from './controllers/usuario-papel.controller.findall-geral';
import { UsuarioPapelControllerRemove } from './controllers/usuario-papel.controller.remove';
import { PapelPermissaoServiceCreate } from './service/papel-permissao.service.create';
import { PapelPermissaoServiceFindAll } from './service/papel-permissao.service.findall';
import { PapelPermissaoServiceRemove } from './service/papel-permissao.service.remove';
import { PapelServiceFindAll } from './service/papel.service.findall';
import { PermissaoServiceFindAll } from './service/permissao.service.findall';
import { UsuarioPapelServiceCreate } from './service/usuario-papel.service.create';
import { UsuarioPapelServiceFindAll } from './service/usuario-papel.service.findall';
import { UsuarioPapelServiceFindAllGeral } from './service/usuario-papel.service.findall-geral';
import { UsuarioPapelServiceRemove } from './service/usuario-papel.service.remove';

// `papel`/`permissao` continuam só-leitura (catálogo gerenciado via seed/
// migração direta, de propósito — criar um papel ou permissão nova é
// decisão maior, fora de escopo aqui). `papel_permissao` ganhou
// insert/delete (03-08-2026, pedido do Lucas: admin precisa conseguir
// conceder/revogar permissão de um papel já existente pelo Painel Admin,
// sem acessar o banco — ver [04-B-1] em 04_rls_policies.sql). Mesmo padrão
// de `usuario_papel`: só insert/delete, não existe "editar" um vínculo,
// só atribuir ou remover.
@Module({
  controllers: [
    PapelControllerFindAll,
    PermissaoControllerFindAll,
    PapelPermissaoControllerFindAll,
    PapelPermissaoControllerCreate,
    PapelPermissaoControllerRemove,
    UsuarioPapelControllerFindAll,
    UsuarioPapelControllerFindAllGeral,
    UsuarioPapelControllerCreate,
    UsuarioPapelControllerRemove,
  ],
  providers: [
    PapelServiceFindAll,
    PermissaoServiceFindAll,
    PapelPermissaoServiceFindAll,
    PapelPermissaoServiceCreate,
    PapelPermissaoServiceRemove,
    UsuarioPapelServiceFindAll,
    UsuarioPapelServiceFindAllGeral,
    UsuarioPapelServiceCreate,
    UsuarioPapelServiceRemove,
  ],
})
export class PapelPermissaoModule {}
