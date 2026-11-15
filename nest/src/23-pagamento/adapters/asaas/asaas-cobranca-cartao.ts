import { GatewayPagamentoErro } from '../../ports/erro-gateway-pagamento';
import { type AsaasPayment } from './asaas.types';

// A página de pagamento do Asaas (a "fatura", `invoiceUrl`). No cartão, é para lá que o "Apoiar" da área pública manda
// quem apoia. No Pix, o QR aparece no próprio modal Apoiar (16-11-2026, decisão do Lucas), e esta página fica como
// alternativa ("abrir na página do Asaas").
// - Cartão: a cobrança é criada SEM dados de cartão; quem apoia digita o cartão nessa página, e o número nunca passa pelo
//   sistema (sem as exigências do padrão de segurança PCI). À vista: nenhuma parcela é pedida. O Asaas libera o dinheiro
//   do cartão cerca de 30 dias depois do pagamento (status RECEIVED); até lá a contribuição fica fora do repasse
//   (dinheiro_liberado_em, 05).
// - Pix: a mesma página mostra o QR e o "copia e cola" da cobrança.
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
