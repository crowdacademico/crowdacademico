import { GatewayPagamentoErro } from '../../ports/erro-gateway-pagamento';
import { type AsaasPayment } from './asaas.types';

// O que é só do cartão de crédito na cobrança do Asaas. A cobrança é criada SEM dados de cartão: quem apoia paga na
// página segura do Asaas (`invoiceUrl`), e o número do cartão nunca passa pelo sistema (sem as exigências do padrão de
// segurança PCI). À vista: nenhuma parcela é pedida. O Asaas libera o dinheiro do cartão cerca de 30 dias depois do
// pagamento (status RECEIVED); até lá a contribuição fica fora do repasse (dinheiro_liberado_em, 05).
export function linkPagamentoCartaoAsaas(pagamento: AsaasPayment): string {
  if (!pagamento.invoiceUrl) {
    throw new GatewayPagamentoErro(
      'REDE',
      'O provedor não devolveu a página de pagamento do cartão.',
      true,
      502,
    );
  }
  return pagamento.invoiceUrl;
}
