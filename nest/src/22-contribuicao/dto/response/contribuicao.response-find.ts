// O que quem contribuiu precisa para acompanhar a própria contribuição (principalmente pendente -> confirmado). Sem
// dado de cobrança, de gateway nem de terceiros.
export class ContribuicaoResponseFind {
  idContribuicao: number;
  idCampanha: number;
  valor: number;
  meioPagamento: string;
  status: string;
  criadoEm: Date;
  // O Termo de Uso aceito ao apoiar (aceite_termo_contribuicao): a versão e quando. null = sem registro (contribuição
  // antiga, ou nenhuma versão ativa no dia). O IP também é gravado, mas não sai daqui.
  termoAceito: { versao: string; aceitoEm: Date } | null;
}
