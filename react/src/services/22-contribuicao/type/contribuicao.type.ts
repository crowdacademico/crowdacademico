// Espelha nest/src/22-contribuicao/dto/response/contribuicao.response-summary.ts.
export interface ResumoContribuicoes {
  // As que entram no arrecadado (confirmadas e repassadas).
  pagas: number;
  // Todas, inclusive as que nunca viraram dinheiro.
  total: number;
}
