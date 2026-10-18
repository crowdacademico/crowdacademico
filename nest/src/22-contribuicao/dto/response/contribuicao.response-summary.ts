// Uma linha do resumo de contribuições de uma campanha: um meio de pagamento numa situação. Só números.
export class ContribuicaoResponseSummary {
  meioPagamento: string;
  status: string;
  quantidade: number;
  // Soma do valor das contribuições (sem a tarifa do provedor, que não entra na campanha).
  total: number;
}
