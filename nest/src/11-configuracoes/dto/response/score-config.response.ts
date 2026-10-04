export class ScoreItemResponse {
  idScoreConfig: number;
  nome: string;
  descricao: string | null;
  peso: number;
  ativo: boolean;
}

// Dimensão (item raiz): o peso é o máximo dela; cada subitem vale a sua parte (peso / soma dos subitens ativos).
export class ScoreDimensaoResponse extends ScoreItemResponse {
  subitens: ScoreItemResponse[];
}

export class ScoreFaixaResponse {
  idRotulo: number;
  rotulo: string;
  descricao: string | null;
  scoreMinimo: number;
  scoreMaximo: number;
}

export class ScoreConfigResponse {
  dimensoes: ScoreDimensaoResponse[];
  faixas: ScoreFaixaResponse[];
}
