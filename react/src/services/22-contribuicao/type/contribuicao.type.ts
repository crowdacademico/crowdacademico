import type { MeioPagamento, StatusContribuicao } from '../../constant/type/enums-do-banco.gerado';

// Espelha nest/src/22-contribuicao/dto/response/contribuicao.response-summary.ts.
export interface ResumoContribuicoes {
  // As que entram no arrecadado (confirmadas e repassadas).
  pagas: number;
  // Todas, inclusive as que nunca viraram dinheiro.
  total: number;
}

// Espelha nest/src/22-contribuicao/dto/response/contribuicao.response-mine.ts.
export interface MinhaContribuicao {
  idContribuicao: number;
  idCampanha: number;
  tituloCampanha: string | null;
  valor: number;
  // A tarifa do meio de pagamento, paga por cima do valor.
  taxaPagamento: number;
  idRepasse: number | null;
  meioPagamento: MeioPagamento;
  status: StatusContribuicao;
  anonima: boolean;
  criadoEm: string;
  tituloRecompensa: string | null;
}
