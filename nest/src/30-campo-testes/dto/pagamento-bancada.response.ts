// Respostas da bancada de pagamento (T05). `noProvedor`: o que o provedor de teste diz da cobrança/transferência
// ('perdida' quando o Nest reiniciou e a memória dele foi apagada); null com provedor real ou sem cobrança.
export class PagamentoBancadaContribuicao {
  idContribuicao: number;
  idCampanha: number;
  tituloCampanha: string;
  valor: number;
  taxaPagamento: number;
  meioPagamento: string;
  dinheiroLiberado: boolean;
  status: string;
  idRepasse: number | null;
  criadoEm: Date;
  noProvedor: string | null;
}

export class PagamentoBancadaRepasse {
  idRepasse: number;
  idCampanha: number;
  tituloCampanha: string;
  status: string;
  valorLiquido: number;
  // Pendente, mas o dono da campanha ainda não tem chave Pix verificada.
  aguardandoConta: boolean;
  noProvedor: string | null;
}

export class PagamentoBancadaEstado {
  provedor: string;
  provedorDeTeste: boolean;
  // Intervalo (minutos) de cada tarefa automática, pela chave do interruptor.
  intervalosMinutos: Record<string, number>;
  contribuicoes: PagamentoBancadaContribuicao[];
  repasses: PagamentoBancadaRepasse[];
}
