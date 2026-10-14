export class ContribuicaoPixResponse {
  // Texto do "PIX copia e cola".
  copiaECola: string;
  // Imagem do QR code em base64 (sem prefixo data:). Pode não vir: dá para montar o QR a partir do copia-e-cola.
  qrCodeBase64?: string;
  expiraEm: Date;
}

export class ContribuicaoResponseCreate {
  idContribuicao: number;
  // Quem contribuiu SEM conta acompanha a contribuição por este token (não pelo id sequencial): é o que impede
  // enumerar contribuições de terceiros (01, [01-H]).
  tokenSessao: string;
  idCampanha: number;
  valor: number;
  meioPagamento: string;
  // Sempre 'pendente' na criação: quem confirma é o webhook do gateway (PR-05).
  status: string;
  criadoEm: Date;
  // Só em contribuição PIX.
  pix?: ContribuicaoPixResponse;
}
