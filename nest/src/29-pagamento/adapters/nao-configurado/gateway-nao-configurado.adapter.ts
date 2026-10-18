import { AutorizacaoSaqueDto } from '../../dto/autorizacao-saque.dto';
import { GatewayPagamentoErro } from '../../ports/erro-gateway-pagamento';
import { EventoPagamentoDto } from '../../dto/evento-pagamento.dto';
import {
  ResultadoCobranca,
  ResultadoEstorno,
} from '../../dto/resultado-cobranca.dto';
import { ResultadoConsultaChavePix } from '../../dto/resultado-chave-pix.dto';
import { ResultadoRepasse } from '../../dto/resultado-repasse.dto';
import { CobrancaGatewayPort } from '../../ports/cobranca-gateway.port';
import { RepasseGatewayPort } from '../../ports/repasse-gateway.port';
import { WebhookVerifierPort } from '../../ports/webhook-verifier.port';

export const NOME_PROVEDOR_NAO_CONFIGURADO = 'nao_configurado';

// Adapter usado quando NÃO há provedor de pagamento configurado em PRODUÇÃO (PAYMENT_PROVIDER ausente). Todas as
// operações de dinheiro recusam com GatewayPagamentoErro('NAO_CONFIGURADO'); todo webhook é considerado inautêntico.
//
// Por que existe, em vez de derrubar o boot: pagamento é UMA feature do sistema. Se faltar a variável e o boot
// falhar, login, campanhas e todo o resto saem do ar por causa de uma configuração que só importa para quem vai
// contribuir. Falhar NO USO (a rota de contribuição responde 503 com mensagem clara, e o módulo registra um erro no
// log ao subir) mantém o resto vivo e continua sem NUNCA aceitar pagamento de mentira: o FakeGatewayAdapter segue
// proibido em produção.
export class GatewayNaoConfiguradoAdapter
  implements CobrancaGatewayPort, RepasseGatewayPort, WebhookVerifierPort
{
  readonly provedor = NOME_PROVEDOR_NAO_CONFIGURADO;

  criarCobranca(): Promise<ResultadoCobranca> {
    return Promise.reject(this.erro());
  }

  consultarCobranca(): Promise<ResultadoCobranca> {
    return Promise.reject(this.erro());
  }

  estornar(): Promise<ResultadoEstorno> {
    return Promise.reject(this.erro());
  }

  cancelarCobranca(): Promise<void> {
    return Promise.reject(this.erro());
  }

  transferir(): Promise<ResultadoRepasse> {
    return Promise.reject(this.erro());
  }

  consultarTransferencia(): Promise<ResultadoRepasse> {
    return Promise.reject(this.erro());
  }

  consultarChavePix(): Promise<ResultadoConsultaChavePix> {
    return Promise.reject(this.erro());
  }

  verificarAutenticidadeSaque(): boolean {
    return false;
  }

  extrairAutorizacaoSaque(): AutorizacaoSaqueDto {
    throw this.erro();
  }

  montarRespostaAutorizacaoSaque(): unknown {
    throw this.erro();
  }

  // Sem provedor, nenhum webhook pode ser autêntico.
  verificarAutenticidade(): boolean {
    return false;
  }

  extrairEvento(): EventoPagamentoDto {
    throw this.erro();
  }

  private erro(): GatewayPagamentoErro {
    return new GatewayPagamentoErro(
      'NAO_CONFIGURADO',
      'Nenhum provedor de pagamento configurado (defina PAYMENT_PROVIDER).',
      false,
      503,
    );
  }
}
