import { Module } from '@nestjs/common';
import { PagamentoModule } from '../23-pagamento/pagamento.module';
import { PagamentoRevisaoControllerAuditoria } from './controllers/pagamento-revisao.controller.auditoria';
import { PagamentoRevisaoControllerEventos } from './controllers/pagamento-revisao.controller.eventos';
import { PagamentoRevisaoControllerReembolsos } from './controllers/pagamento-revisao.controller.reembolsos';
import { PagamentoRevisaoControllerRepasses } from './controllers/pagamento-revisao.controller.repasses';
import { PagamentoRevisaoServiceAuditoria } from './service/pagamento-revisao.service.auditoria';
import { PagamentoRevisaoServiceEventos } from './service/pagamento-revisao.service.eventos';
import { PagamentoRevisaoServiceReembolsos } from './service/pagamento-revisao.service.reembolsos';
import { PagamentoRevisaoServiceRepasses } from './service/pagamento-revisao.service.repasses';

// Painel de revisão manual de pagamentos (só estrutura de API; a tela é do front). Autorização por PERMISSÃO conferida
// dentro das funções do banco, como no resto do projeto: não há guard de papel aqui.
@Module({
  // PagamentoModule: o "Marcar como pago" consulta a transferência no provedor (REPASSE_GATEWAY) antes de aceitar.
  imports: [PagamentoModule],
  controllers: [
    PagamentoRevisaoControllerAuditoria,
    PagamentoRevisaoControllerEventos,
    PagamentoRevisaoControllerReembolsos,
    PagamentoRevisaoControllerRepasses,
  ],
  providers: [
    PagamentoRevisaoServiceAuditoria,
    PagamentoRevisaoServiceEventos,
    PagamentoRevisaoServiceReembolsos,
    PagamentoRevisaoServiceRepasses,
  ],
})
export class PagamentoRevisaoModule {}
