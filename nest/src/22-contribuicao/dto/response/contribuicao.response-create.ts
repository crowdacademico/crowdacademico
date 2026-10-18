export class ContribuicaoPixResponse {
  // Texto do "PIX copia e cola".
  copiaECola: string;
  // Imagem do QR code em base64 (sem prefixo data:). Pode não vir: dá para montar o QR a partir do copia-e-cola.
  qrCodeBase64?: string;
  expiraEm: Date;
}

export class ContribuicaoCartaoResponse {
  // Página segura do provedor onde quem apoia digita o cartão e paga (o cartão nunca passa pelo sistema).
  linkPagamento: string;
}

export class ContribuicaoBoletoResponse {
  // Página do provedor com o boleto para imprimir ou baixar.
  link: string;
  // Os números do boleto, para pagar pelo aplicativo do banco.
  linhaDigitavel: string;
  venceEm: Date;
}

export class ContribuicaoResponseCreate {
  idContribuicao: number;
  // Quem contribuiu SEM conta acompanha a contribuição por este token (não pelo id sequencial): é o que impede
  // enumerar contribuições de terceiros (01, [01-H]).
  tokenSessao: string;
  idCampanha: number;
  // O que entra na campanha.
  valor: number;
  // Tarifa do provedor de pagamento, paga por quem apoia além do valor (0 = sem tarifa).
  taxaPagamento: number;
  // O que a cobrança pede: valor + taxaPagamento.
  valorCobrado: number;
  meioPagamento: string;
  // Sempre 'pendente' na criação: quem confirma é o webhook do gateway (PR-05).
  status: string;
  criadoEm: Date;
  // Só em contribuição PIX.
  pix?: ContribuicaoPixResponse;
  // Só em contribuição com cartão.
  cartao?: ContribuicaoCartaoResponse;
  // Só em contribuição com boleto.
  boleto?: ContribuicaoBoletoResponse;
}
