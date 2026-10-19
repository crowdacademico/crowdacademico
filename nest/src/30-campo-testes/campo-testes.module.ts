import { Module } from '@nestjs/common';
import { TermoUsoModule } from '../5-termo-uso/termo-uso.module';
import { PagamentoModule } from '../23-pagamento/pagamento.module';
import { EmailModule } from '../4-mail/email.module';
import { ContaRecebimentoModule } from '../24-conta-recebimento/conta-recebimento.module';
import { CampanhaServiceFindOne } from '../12-campanha/service/campanha.service.findone';
import { PerfilPesquisadorServiceFindOne } from '../6-perfil-pesquisador/service/perfil-pesquisador.service.findone';
import { CampanhaControllerCreateForOther } from './controllers/campanha.controller.create-for-other';
import { CampanhaControllerForceRemove } from './controllers/campanha.controller.force-remove';
import { PagamentoControllerBancada } from './controllers/pagamento.controller.bancada';
import { EmailControllerCaixa } from './controllers/email.controller.caixa';
import { PerfilPesquisadorControllerCreateForOther } from './controllers/perfil-pesquisador.controller.create-for-other';
import { CampanhaServiceCreateForOther } from './service/campanha.service.create-for-other';
import { CampanhaServiceForceRemove } from './service/campanha.service.force-remove';
import { PagamentoServiceBancada } from './service/pagamento.service.bancada';
import { EmailServiceCaixa } from './service/email.service.caixa';
import { PerfilPesquisadorServiceCreateForOther } from './service/perfil-pesquisador.service.create-for-other';

// Rotas que só o Campo de Testes do painel usa (criar campanha e perfil de pesquisador em nome de outra conta,
// forçar a exclusão de campanha), a bancada de pagamento (T05, /campo-testes/pagamento) e a caixa de entrada do provedor
// de e-mail de teste (/campo-testes/email). Mesmas URLs de antes, dentro de /campanha e /perfil-pesquisador. Usa o sistema
// (serviços de leitura e o módulo do Termo de Uso); o sistema nunca importa daqui. Só é carregado fora de produção
// (app.module.ts); no banco do deploy, as permissões destas ferramentas também são retiradas do admin.
@Module({
  imports: [
    TermoUsoModule,
    PagamentoModule,
    ContaRecebimentoModule,
    EmailModule,
  ],
  controllers: [
    CampanhaControllerCreateForOther,
    CampanhaControllerForceRemove,
    PerfilPesquisadorControllerCreateForOther,
    PagamentoControllerBancada,
    EmailControllerCaixa,
  ],
  providers: [
    CampanhaServiceCreateForOther,
    CampanhaServiceForceRemove,
    PerfilPesquisadorServiceCreateForOther,
    PagamentoServiceBancada,
    EmailServiceCaixa,
    CampanhaServiceFindOne,
    PerfilPesquisadorServiceFindOne,
  ],
})
export class CampoTestesModule {}
