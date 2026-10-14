import { type AutorizacaoSaqueDto } from '../../dto/autorizacao-saque.dto';
import { type EventoPagamentoDto } from '../../dto/evento-pagamento.dto';
import { type ResultadoConsultaChavePix } from '../../dto/resultado-chave-pix.dto';
import {
  type ResultadoCobranca,
  type ResultadoEstorno,
} from '../../dto/resultado-cobranca.dto';
import { type ResultadoRepasse } from '../../dto/resultado-repasse.dto';
import {
  type CobrancaGatewayPort,
  type CriarCobrancaParams,
} from '../../ports/cobranca-gateway.port';
import {
  type RepasseGatewayPort,
  type TransferirParams,
} from '../../ports/repasse-gateway.port';
import {
  type CabecalhosHttp,
  type WebhookVerifierPort,
} from '../../ports/webhook-verifier.port';
import { AsaasCobrancaAdapter } from './asaas-cobranca.adapter';
import { AsaasHttpClient } from './asaas-http.client';
import { AsaasRepasseAdapter } from './asaas-repasse.adapter';
import { AsaasWebhookAdapter } from './asaas-webhook.adapter';
import { type ConfiguracaoAsaas } from './asaas.config';

// Fachada: UMA instância que satisfaz as três portas (mesmo contrato do FakeGatewayAdapter), compondo os três adapters.
// O PagamentoModule a injeta nos tokens COBRANCA_GATEWAY, REPASSE_GATEWAY e WEBHOOK_VERIFIER.
export class AsaasGatewayAdapter
  implements CobrancaGatewayPort, RepasseGatewayPort, WebhookVerifierPort
{
  readonly provedor: string;
  private readonly cobranca: AsaasCobrancaAdapter;
  private readonly repasse: AsaasRepasseAdapter;
  private readonly webhook: AsaasWebhookAdapter;

  constructor(config: ConfiguracaoAsaas, fetchImpl: typeof fetch = fetch) {
    const http = new AsaasHttpClient(config, fetchImpl);
    this.cobranca = new AsaasCobrancaAdapter(http, config);
    this.repasse = new AsaasRepasseAdapter(http, config);
    this.webhook = new AsaasWebhookAdapter(config);
    this.provedor = this.cobranca.provedor;
  }

  criarCobranca(params: CriarCobrancaParams): Promise<ResultadoCobranca> {
    return this.cobranca.criarCobranca(params);
  }
  consultarCobranca(idCobranca: string): Promise<ResultadoCobranca> {
    return this.cobranca.consultarCobranca(idCobranca);
  }
  estornar(
    idCobranca: string,
    valor?: number,
    opcoes?: { chaveIdempotencia?: string },
  ): Promise<ResultadoEstorno> {
    return this.cobranca.estornar(idCobranca, valor, opcoes);
  }
  cancelarCobranca(idCobranca: string): Promise<void> {
    return this.cobranca.cancelarCobranca(idCobranca);
  }

  transferir(params: TransferirParams): Promise<ResultadoRepasse> {
    return this.repasse.transferir(params);
  }
  consultarTransferencia(idTransferencia: string): Promise<ResultadoRepasse> {
    return this.repasse.consultarTransferencia(idTransferencia);
  }
  consultarChavePix(
    destino: TransferirParams['destino'],
  ): Promise<ResultadoConsultaChavePix> {
    return this.repasse.consultarChavePix(destino);
  }

  verificarAutenticidade(cabecalhos: CabecalhosHttp): boolean {
    return this.webhook.verificarAutenticidade(cabecalhos);
  }
  verificarAutenticidadeSaque(cabecalhos: CabecalhosHttp): boolean {
    return this.webhook.verificarAutenticidadeSaque(cabecalhos);
  }
  extrairEvento(corpo: unknown): EventoPagamentoDto {
    return this.webhook.extrairEvento(corpo);
  }
  extrairAutorizacaoSaque(corpo: unknown): AutorizacaoSaqueDto {
    return this.webhook.extrairAutorizacaoSaque(corpo);
  }
  montarRespostaAutorizacaoSaque(aprovado: boolean, motivo?: string): unknown {
    return this.webhook.montarRespostaAutorizacaoSaque(aprovado, motivo);
  }
}
