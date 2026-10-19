// Quantas contribuições uma campanha tem. Só números.
export class ContribuicaoResponseSummary {
  // As que entram no arrecadado (confirmadas e repassadas).
  pagas: number;
  // Todas, inclusive as que nunca viraram dinheiro (vencidas, com erro, devolvidas).
  total: number;
}
