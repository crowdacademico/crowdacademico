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
import { ScoreConfigControllerFindAll } from './controllers/score-config.controller.findall';
import { ScoreConfigControllerUpdate } from './controllers/score-config.controller.update';
import { ScoreRotuloControllerUpdate } from './controllers/score-rotulo.controller.update';
import { ScoreConfigServiceFindAll } from './service/score-config.service.findall';
import { ScoreConfigServiceUpdate } from './service/score-config.service.update';
import { ScoreRotuloServiceUpdate } from './service/score-rotulo.service.update';

@Module({
  controllers: [
    ConfiguracoesControllerCreate,
    ConfiguracoesControllerFindAll,
    ConfiguracoesControllerFindOne,
    ConfiguracoesControllerUpdate,
    ConfiguracoesControllerRemove,
    ScoreConfigControllerFindAll,
    ScoreConfigControllerUpdate,
    ScoreRotuloControllerUpdate,
  ],
  providers: [
    ConfiguracoesServiceCreate,
    ConfiguracoesServiceFindAll,
    ConfiguracoesServiceFindOne,
    ConfiguracoesServiceUpdate,
    ConfiguracoesServiceRemove,
    ScoreConfigServiceFindAll,
    ScoreConfigServiceUpdate,
    ScoreRotuloServiceUpdate,
  ],
})
export class ConfiguracoesModule {}
