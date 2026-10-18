import type { MeioPagamento, StatusContribuicao } from '../../constant/type/enums-do-banco.gerado';

// Espelha nest/src/22-contribuicao/dto/response/contribuicao.response-summary.ts.
export interface ResumoContribuicoes {
  meioPagamento: MeioPagamento;
  status: StatusContribuicao;
  quantidade: number;
  total: number;
}
