import { type DadosBoleto } from '../../dto/resultado-cobranca.dto';
import { GatewayPagamentoErro } from '../../ports/erro-gateway-pagamento';
import { AsaasHttpClient } from './asaas-http.client';
import {
  type AsaasDevolucaoBoleto,
  type AsaasLinhaDigitavel,
  type AsaasPayment,
} from './asaas.types';

// O que é só do boleto na cobrança do Asaas. O boleto vence numa data (boleto_vencimento_dias) e o Asaas leva cerca de
// 1 dia útil para confirmar o pagamento (status RECEIVED, que já é o dinheiro liberado). Só em campanha flexível e
// desligado por padrão (boleto_habilitado, 05).
export async function dadosBoletoAsaas(
  http: AsaasHttpClient,
  pagamento: AsaasPayment,
  venceEm: Date,
): Promise<DadosBoleto> {
  if (!pagamento.bankSlipUrl) {
    throw new GatewayPagamentoErro(
      'REDE',
      'O provedor não devolveu o boleto.',
      true,
      502,
    );
  }
  const linha = await http.requisitar<AsaasLinhaDigitavel>(
    'GET',
    `/payments/${encodeURIComponent(pagamento.id)}/identificationField`,
  );
  return {
    link: pagamento.bankSlipUrl,
    linhaDigitavel: linha.identificationField,
    venceEm,
  };
}

// Devolução de boleto: diferente do Pix e do cartão, o Asaas não devolve sozinho para quem pagou. Ele gera um link onde
// quem apoiou informa a conta bancária e manda um documento; só depois disso devolve. O sistema pede o link e para por
// aqui: a contribuição vai para reembolso manual com o link no motivo, para o admin enviá-lo a quem apoiou. Quando o
// Asaas concluir, o aviso de estorno fecha a contribuição como devolvida (aplicar_evento_pagamento, 05).
export async function pedirDevolucaoBoletoAsaas(
  http: AsaasHttpClient,
  idCobranca: string,
): Promise<never> {
  const pedido = await http.requisitar<AsaasDevolucaoBoleto>(
    'POST',
    `/payments/${encodeURIComponent(idCobranca)}/bankSlip/refund`,
  );
  throw new GatewayPagamentoErro(
    'RECUSADO',
    `Boleto: envie a quem apoiou o link para informar a conta da devolução: ${pedido.requestUrl}`,
    false,
  );
}
