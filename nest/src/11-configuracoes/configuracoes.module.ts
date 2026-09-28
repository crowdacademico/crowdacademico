import { Module } from '@nestjs/common';
import { ConfiguracoesControllerCreate } from './controllers/configuracoes.controller.create';
import { ConfiguracoesControllerFindAll } from './controllers/configuracoes.controller.findall';
import { ConfiguracoesControllerFindOne } from './controllers/configuracoes.controller.findone';
import { ConfiguracoesControllerRemove } from './controllers/configuracoes.controller.remove';
import { ConfiguracoesControllerUpdate } from './controllers/configuracoes.controller.update';
import { ConfiguracoesServiceCreate } from './service/configuracoes.service.create';
import { ConfiguracoesServiceFindAll } from './service/configuracoes.service.findall';
import { ConfiguracoesServiceFindOne } from './service/configuracoes.service.findone';
import { ConfiguracoesServiceRemove } from './service/configuracoes.service.remove';
import { ConfiguracoesServiceUpdate } from './service/configuracoes.service.update';

@Module({
  controllers: [
    ConfiguracoesControllerCreate,
    ConfiguracoesControllerFindAll,
    ConfiguracoesControllerFindOne,
    ConfiguracoesControllerUpdate,
    ConfiguracoesControllerRemove,
  ],
  providers: [
    ConfiguracoesServiceCreate,
    ConfiguracoesServiceFindAll,
    ConfiguracoesServiceFindOne,
    ConfiguracoesServiceUpdate,
    ConfiguracoesServiceRemove,
  ],
})
export class ConfiguracoesModule {}
