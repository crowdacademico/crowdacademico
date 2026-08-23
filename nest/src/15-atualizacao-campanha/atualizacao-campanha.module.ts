import { Module } from '@nestjs/common';
import { ArquivoAtualizacaoControllerCreate } from './controllers/arquivo-atualizacao.controller.create';
import { ArquivoAtualizacaoControllerFindAll } from './controllers/arquivo-atualizacao.controller.findall';
import { AtualizacaoCampanhaControllerCreate } from './controllers/atualizacao-campanha.controller.create';
import { AtualizacaoCampanhaControllerFindAll } from './controllers/atualizacao-campanha.controller.findall';
import { AtualizacaoCampanhaControllerUpdate } from './controllers/atualizacao-campanha.controller.update';
import { LinkAtualizacaoControllerCreate } from './controllers/link-atualizacao.controller.create';
import { LinkAtualizacaoControllerFindAll } from './controllers/link-atualizacao.controller.findall';
import { LinkAtualizacaoControllerRemove } from './controllers/link-atualizacao.controller.remove';
import { LinkAtualizacaoControllerUpdate } from './controllers/link-atualizacao.controller.update';
import { ArquivoAtualizacaoServiceCreate } from './service/arquivo-atualizacao.service.create';
import { ArquivoAtualizacaoServiceFindAll } from './service/arquivo-atualizacao.service.findall';
import { AtualizacaoCampanhaServiceCreate } from './service/atualizacao-campanha.service.create';
import { AtualizacaoCampanhaServiceFindAll } from './service/atualizacao-campanha.service.findall';
import { AtualizacaoCampanhaServiceUpdate } from './service/atualizacao-campanha.service.update';
import { LinkAtualizacaoServiceCreate } from './service/link-atualizacao.service.create';
import { LinkAtualizacaoServiceFindAll } from './service/link-atualizacao.service.findall';
import { LinkAtualizacaoServiceRemove } from './service/link-atualizacao.service.remove';
import { LinkAtualizacaoServiceUpdate } from './service/link-atualizacao.service.update';

// Um só @Module cobrindo 3 tabelas (atualizacao_campanha + os satélites
// link_atualizacao/arquivo_atualizacao) — decisão registrada na conversa
// de 22-08-2026 sobre ordem de prioridade de campanha: nenhuma das duas
// tem pasta numerada própria em PROXIMOS_MODULOS.md, então entram dentro
// do módulo-pai em vez de ganhar uma pasta nova sem numeração.
@Module({
  controllers: [
    AtualizacaoCampanhaControllerCreate,
    AtualizacaoCampanhaControllerFindAll,
    AtualizacaoCampanhaControllerUpdate,
    LinkAtualizacaoControllerCreate,
    LinkAtualizacaoControllerFindAll,
    LinkAtualizacaoControllerUpdate,
    LinkAtualizacaoControllerRemove,
    ArquivoAtualizacaoControllerCreate,
    ArquivoAtualizacaoControllerFindAll,
  ],
  providers: [
    AtualizacaoCampanhaServiceCreate,
    AtualizacaoCampanhaServiceFindAll,
    AtualizacaoCampanhaServiceUpdate,
    LinkAtualizacaoServiceCreate,
    LinkAtualizacaoServiceFindAll,
    LinkAtualizacaoServiceUpdate,
    LinkAtualizacaoServiceRemove,
    ArquivoAtualizacaoServiceCreate,
    ArquivoAtualizacaoServiceFindAll,
  ],
})
export class AtualizacaoCampanhaModule {}
