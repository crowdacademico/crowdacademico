import { Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AsaasGatewayAdapter } from './adapters/asaas/asaas-gateway.adapter';
import { lerConfiguracaoAsaas } from './adapters/asaas/asaas.config';
import { FakeGatewayAdapter } from './adapters/fake/fake-gateway.adapter';
import { GatewayNaoConfiguradoAdapter } from './adapters/nao-configurado/gateway-nao-configurado.adapter';
import { PagamentoControllerWebhook } from './controllers/pagamento.controller.webhook';
import { EventoPagamentoService } from './evento-pagamento.service';
import { PagamentoServiceAuthorizeWithdrawal } from './service/pagamento.service.authorize-withdrawal';
import { PagamentoServiceReconcile } from './service/pagamento.service.reconcile';
import { PagamentoServiceRefundPending } from './service/pagamento.service.refund-pending';
import { PagamentoServiceTransferPending } from './service/pagamento.service.transfer-pending';
import { PagamentoServiceWebhook } from './service/pagamento.service.webhook';
import {
  COBRANCA_GATEWAY,
  CobrancaGatewayPort,
} from './ports/cobranca-gateway.port';
import {
  REPASSE_GATEWAY,
  RepasseGatewayPort,
} from './ports/repasse-gateway.port';
import {
  WEBHOOK_VERIFIER,
  WebhookVerifierPort,
} from './ports/webhook-verifier.port';

// Escolhe o adapter pela variável PAYMENT_PROVIDER ('fake' | 'asaas'). Regras:
//  - Ausente em desenvolvimento/teste => 'fake' (subir o projeto sem configurar nada continua funcionando).
//  - Ausente em PRODUÇÃO => o sistema SOBE, com um erro no log, e todas as operações de pagamento recusam com
//    GatewayPagamentoErro('NAO_CONFIGURADO') (a rota de contribuição responde 503). Derrubar o boot tiraria do ar
//    login, campanhas e tudo o mais por causa de uma feature que só importa na hora de contribuir; e continua
//    impossível aceitar pagamento de mentira, porque o fake segue proibido em produção (próxima regra).
//  - 'fake' em PRODUÇÃO => o boot FALHA: é escolha EXPLÍCITA e errada (aceitaria pagamentos que nunca existiram), e
//    falhar alto é melhor que descobrir em campanha real.
//  - 'asaas' => adapter real do Asaas (PR-10). Lê e valida as variáveis ASAAS_* (ver adapters/asaas/asaas.config.ts, que
//    explica o que preencher em cada uma); configuração incompleta ou de ambiente trocado FAZ O BOOT FALHAR com a lista do
//    que corrigir (escolha explícita + dinheiro: falhar alto é melhor que descobrir na primeira contribuição).
//
// TROCAR DE GATEWAY: criar a classe nova implementando as três portas e adicionar um case em `criarAdapter`.
// Nenhum consumidor muda, porque todos dependem só dos tokens (COBRANCA_GATEWAY, REPASSE_GATEWAY,
// WEBHOOK_VERIFIER), nunca da classe do adapter. Mesmo padrão de StorageModule (commons/storage).
//
// O adapter é UMA instância compartilhada pelos três tokens (`useExisting`): no Fake, cobrança, repasse e webhook
// precisam enxergar o mesmo estado em memória.
export const ADAPTER_PAGAMENTO = 'ADAPTER_PAGAMENTO';

export type AdapterPagamento = CobrancaGatewayPort &
  RepasseGatewayPort &
  WebhookVerifierPort;

export function criarAdapter(
  config: Pick<ConfigService, 'get'>,
  logger: Pick<Logger, 'error'> = new Logger('PagamentoModule'),
): AdapterPagamento {
  const emProducao = config.get<string>('NODE_ENV') === 'production';
  const provedor =
    config.get<string>('PAYMENT_PROVIDER') ?? (emProducao ? undefined : 'fake');

  if (provedor === undefined) {
    logger.error(
      'PAYMENT_PROVIDER não definido em produção: pagamentos DESABILITADOS (contribuir responde 503). Defina o provedor (ex.: "asaas") para habilitar.',
    );
    return new GatewayNaoConfiguradoAdapter();
  }
  switch (provedor) {
    case 'fake':
      if (emProducao) {
        throw new Error(
          'PAYMENT_PROVIDER=fake não pode ser usado em produção: o gateway de mentira aceitaria pagamentos que nunca existiram.',
        );
      }
      return new FakeGatewayAdapter();
    case 'asaas':
      return new AsaasGatewayAdapter(lerConfiguracaoAsaas(config));
    default:
      throw new Error(
        `PAYMENT_PROVIDER desconhecido: "${provedor}". Valores aceitos: fake, asaas.`,
      );
  }
}

@Module({
  imports: [ConfigModule],
  controllers: [PagamentoControllerWebhook],
  providers: [
    {
      provide: ADAPTER_PAGAMENTO,
      inject: [ConfigService],
      useFactory: criarAdapter,
    },
    { provide: COBRANCA_GATEWAY, useExisting: ADAPTER_PAGAMENTO },
    { provide: REPASSE_GATEWAY, useExisting: ADAPTER_PAGAMENTO },
    { provide: WEBHOOK_VERIFIER, useExisting: ADAPTER_PAGAMENTO },
    EventoPagamentoService,
    PagamentoServiceWebhook,
    PagamentoServiceAuthorizeWithdrawal,
    PagamentoServiceRefundPending,
    PagamentoServiceTransferPending,
    PagamentoServiceReconcile,
  ],
  exports: [
    COBRANCA_GATEWAY,
    REPASSE_GATEWAY,
    WEBHOOK_VERIFIER,
    EventoPagamentoService,
  ],
})
export class PagamentoModule {}
