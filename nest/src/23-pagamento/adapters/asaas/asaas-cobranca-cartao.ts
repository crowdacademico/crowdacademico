import { GatewayPagamentoErro } from '../../ports/erro-gateway-pagamento';
import { type AsaasPayment } from './asaas.types';

// A página de pagamento do Asaas (a "fatura", `invoiceUrl`): é para lá que o "Apoiar" da área pública manda quem apoia,
// no Pix e no cartão (16-11-2026, decisão do Lucas: o Asaas mostra o QR, a validade e a situação; o sistema não tem mais
// tela de QR própria).
// - Cartão: a cobrança é criada SEM dados de cartão; quem apoia digita o cartão nessa página, e o número nunca passa pelo
//   sistema (sem as exigências do padrão de segurança PCI). À vista: nenhuma parcela é pedida. O Asaas libera o dinheiro
//   do cartão cerca de 30 dias depois do pagamento (status RECEIVED); até lá a contribuição fica fora do repasse
//   (dinheiro_liberado_em, 05).
// - Pix: a mesma página mostra o QR e o "copia e cola" da cobrança (que continuam vindo também em `pix`).
export function linkPagamentoAsaas(pagamento: AsaasPayment): string {
  if (!pagamento.invoiceUrl) {
    throw new GatewayPagamentoErro(
      'REDE',
      'O provedor não devolveu a página de pagamento.',
      true,
      502,
    );
  }
  return pagamento.invoiceUrl;
}
