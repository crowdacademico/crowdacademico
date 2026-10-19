import type { MeioPagamento, StatusContribuicao, StatusRepasse, TipoChavePix } from '../../../services/constant/type/enums-do-banco.gerado';

// Espelha nest/src/30-campo-testes (rotas /campo-testes/pagamento). Recebe a função de chamada da tela (a que grava no
// Registro de Chamadas), não o authFetch cru.
type Chamar = <T>(caminho: string, opcoes?: RequestInit) => Promise<T>;

const BASE = '/campo-testes/pagamento';
const POST: RequestInit = { method: 'POST' };

export type TarefaBancada = 'encerrar' | 'repasse' | 'devolucao' | 'conferir' | 'pagar' | 'email';

export interface ContribuicaoBancada {
  idContribuicao: number;
  idCampanha: number;
  tituloCampanha: string;
  valor: number;
  taxaPagamento: number;
  meioPagamento: MeioPagamento;
  // Pix: disponível ao pagar. Cartão: só quando o provedor libera (~30 dias).
  dinheiroLiberado: boolean;
  status: StatusContribuicao;
  idRepasse: number | null;
  criadoEm: string;
  // O que o provedor de teste diz da cobrança ('perdida' = o Nest reiniciou); null com provedor real.
  noProvedor: string | null;
}

export interface RepasseBancada {
  idRepasse: number;
  idCampanha: number;
  tituloCampanha: string;
  status: StatusRepasse;
  valorLiquido: number;
  aguardandoConta: boolean;
  noProvedor: string | null;
}

export interface EstadoBancada {
  provedor: string;
  provedorDeTeste: boolean;
  // Intervalo (minutos) de cada tarefa automática, pela chave do interruptor (vem do Nest, que agenda as tarefas).
  intervalosMinutos: Record<string, number>;
  contribuicoes: ContribuicaoBancada[];
  repasses: RepasseBancada[];
}

// Resposta de POST /contribuicao (nest/src/22-contribuicao/dto/response/contribuicao.response-create.ts).
export interface ContribuicaoCriada {
  idContribuicao: number;
  valor: number;
  taxaPagamento: number;
  valorCobrado: number;
  status: StatusContribuicao;
  criadoEm: string;
  pix?: { copiaECola: string; qrCodeBase64?: string; expiraEm: string };
  cartao?: { linkPagamento: string };
  boleto?: { link: string; linhaDigitavel: string; venceEm: string };
}

export interface ChavePixCadastrada {
  tipoChave: TipoChavePix;
  chaveMascarada: string;
  titularidadeVerificada: boolean;
}

// De qual card da T5 é uma chamada do Registro de Chamadas. O estado da bancada e as tarefas automáticas mexem nas duas
// tabelas, então aparecem nos dois registros.
const deTodos = (caminho: string) => caminho === BASE || caminho.startsWith(`${BASE}/tarefas/`);
export const ehChamadaDeContribuicoes = ({ caminho }: { caminho: string }) =>
  deTodos(caminho) || caminho === '/contribuicao' || caminho.startsWith(`${BASE}/contribuicoes/`);
export const ehChamadaDeRepasses = ({ caminho }: { caminho: string }) =>
  deTodos(caminho) || caminho === `${BASE}/chave-pix` || caminho.startsWith(`${BASE}/repasses/`);

export const bancadaPagamentoApi = {
  estado: (chamar: Chamar) => chamar<EstadoBancada>(BASE),
  contribuir: (chamar: Chamar, idCampanha: number, valor: number, meioPagamento: 'pix' | 'cartao_credito' | 'boleto') =>
    chamar<ContribuicaoCriada>('/contribuicao', {
      method: 'POST',
      body: JSON.stringify({ idCampanha, valor, meioPagamento }),
    }),
  liberar: (chamar: Chamar, idContribuicao: number) => chamar<void>(`${BASE}/contribuicoes/${idContribuicao}/liberar`, POST),
  pagar: (chamar: Chamar, idContribuicao: number) => chamar<void>(`${BASE}/contribuicoes/${idContribuicao}/pagar`, POST),
  vencer: (chamar: Chamar, idContribuicao: number) => chamar<void>(`${BASE}/contribuicoes/${idContribuicao}/vencer`, POST),
  repetirAviso: (chamar: Chamar, idContribuicao: number) =>
    chamar<void>(`${BASE}/contribuicoes/${idContribuicao}/repetir-aviso`, POST),
  concluirTransferencia: (chamar: Chamar, idRepasse: number) => chamar<void>(`${BASE}/repasses/${idRepasse}/concluir`, POST),
  falharTransferencia: (chamar: Chamar, idRepasse: number) => chamar<void>(`${BASE}/repasses/${idRepasse}/falhar`, POST),
  rodar: (chamar: Chamar, tarefa: TarefaBancada) => chamar<void>(`${BASE}/tarefas/${tarefa}`, POST),
  cadastrarChavePix: (chamar: Chamar, tipoChave: TipoChavePix, chave: string) =>
    chamar<ChavePixCadastrada | null>(`${BASE}/chave-pix`, {
      method: 'POST',
      body: JSON.stringify({ tipoChave, chave }),
    }),
};
