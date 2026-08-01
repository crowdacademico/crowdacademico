import { Module } from '@nestjs/common';
import { ConfiguracaoControllerCreate } from './controllers/configuracao.controller.create';
import { ConfiguracaoControllerFindAll } from './controllers/configuracao.controller.findall';
import { ConfiguracaoControllerFindOne } from './controllers/configuracao.controller.findone';
import { ConfiguracaoControllerRemove } from './controllers/configuracao.controller.remove';
import { ConfiguracaoControllerUpdate } from './controllers/configuracao.controller.update';
import { ConfiguracaoServiceCreate } from './service/configuracao.service.create';
import { ConfiguracaoServiceFindAll } from './service/configuracao.service.findall';
import { ConfiguracaoServiceFindOne } from './service/configuracao.service.findone';
import { ConfiguracaoServiceRemove } from './service/configuracao.service.remove';
import { ConfiguracaoServiceUpdate } from './service/configuracao.service.update';

@Module({
  controllers: [
    ConfiguracaoControllerCreate,
    ConfiguracaoControllerFindAll,
    ConfiguracaoControllerFindOne,
    ConfiguracaoControllerUpdate,
    ConfiguracaoControllerRemove,
  ],
  providers: [
    ConfiguracaoServiceCreate,
    ConfiguracaoServiceFindAll,
    ConfiguracaoServiceFindOne,
    ConfiguracaoServiceUpdate,
    ConfiguracaoServiceRemove,
  ],
})
export class ConfiguracoesModule {}
