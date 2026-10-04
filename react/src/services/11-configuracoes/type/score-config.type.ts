// Espelha nest/src/11-configuracoes/dto/response/score-config.response.ts.
export interface ScoreItemResponse {
  idScoreConfig: number;
  nome: string;
  descricao: string | null;
  peso: number;
  ativo: boolean;
}

export interface ScoreDimensaoResponse extends ScoreItemResponse {
  subitens: ScoreItemResponse[];
}

export interface ScoreFaixaResponse {
  idRotulo: number;
  rotulo: string;
  descricao: string | null;
  scoreMinimo: number;
  scoreMaximo: number;
}

export interface ScoreConfigResponse {
  dimensoes: ScoreDimensaoResponse[];
  faixas: ScoreFaixaResponse[];
}

export interface ScoreItemPesoRequest {
  idScoreConfig: number;
  peso: number;
  ativo: boolean;
}
