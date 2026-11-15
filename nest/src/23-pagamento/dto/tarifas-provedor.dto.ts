// As tarifas que o provedor cobra HOJE desta conta (16-11-2026), já com o desconto quando ele está valendo. Em reais e
// por cento, como os parâmetros de configuracoes que elas alimentam (taxa_pagamento_pix, taxa_pagamento_boleto,
// taxa_cartao_percentual, taxa_cartao_fixa). Cartão: à vista, a única forma que o sistema usa.
export interface TarifasProvedor {
  pix: number;
  boleto: number;
  cartaoPercentual: number;
  cartaoFixa: number;
}
