import { Module } from '@nestjs/common';
import { PagamentoModule } from '../23-pagamento/pagamento.module';
import { PagamentoRevisaoControllerAuditoria } from './controllers/pagamento-revisao.controller.auditoria';
import { PagamentoRevisaoControllerContribuicoes } from './controllers/pagamento-revisao.controller.contribuicoes';
import { PagamentoRevisaoControllerEventos } from './controllers/pagamento-revisao.controller.eventos';
import { PagamentoRevisaoControllerReembolsos } from './controllers/pagamento-revisao.controller.reembolsos';
import { PagamentoRevisaoControllerRepasses } from './controllers/pagamento-revisao.controller.repasses';
import { PagamentoRevisaoServiceAuditoria } from './service/pagamento-revisao.service.auditoria';
import { PagamentoRevisaoServiceContribuicoes } from './service/pagamento-revisao.service.contribuicoes';
import { PagamentoRevisaoServiceEventos } from './service/pagamento-revisao.service.eventos';
import { PagamentoRevisaoServiceReembolsos } from './service/pagamento-revisao.service.reembolsos';
import { PagamentoRevisaoServiceRepasses } from './service/pagamento-revisao.service.repasses';
import { PagamentoRevisaoServiceRepassesTodos } from './service/pagamento-revisao.service.repasses-todos';

// Painel de revisão manual de pagamentos (só estrutura de API; a tela é do front). Autorização por PERMISSÃO conferida
// dentro das funções do banco, como no resto do projeto: não há guard de papel aqui.
@Module({
  // PagamentoModule: o "Marcar como pago" consulta a transferência no provedor (REPASSE_GATEWAY) antes de aceitar.
  imports: [PagamentoModule],
  controllers: [
    PagamentoRevisaoControllerAuditoria,
    PagamentoRevisaoControllerContribuicoes,
    PagamentoRevisaoControllerEventos,
    PagamentoRevisaoControllerReembolsos,
    PagamentoRevisaoControllerRepasses,
  ],
  providers: [
    PagamentoRevisaoServiceAuditoria,
    PagamentoRevisaoServiceContribuicoes,
    PagamentoRevisaoServiceEventos,
    PagamentoRevisaoServiceReembolsos,
    PagamentoRevisaoServiceRepasses,
    PagamentoRevisaoServiceRepassesTodos,
  ],
})
export class PagamentoRevisaoModule {}
