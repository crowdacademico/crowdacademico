// O que quem contribuiu precisa para acompanhar a própria contribuição (principalmente pendente -> confirmado). Sem
// dado de cobrança, de gateway nem de terceiros.
export class ContribuicaoResponseFind {
  idContribuicao: number;
  idCampanha: number;
  valor: number;
  meioPagamento: string;
  status: string;
  criadoEm: Date;
}
