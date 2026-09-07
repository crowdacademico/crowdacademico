// Espelha nest/src/8-area-conhecimento/dto/response/area-conhecimento.response.ts.
export interface AreaConhecimentoResponse {
  idAreaConhecimento: number;
  codigoCnpq: string;
  nome: string;
  idPai: number | null;
  nomePai: string | null;
  ativo: boolean;
}

// Espelha area-conhecimento.request-create.ts.
export interface AreaConhecimentoRequestCreate {
  codigoCnpq: string;
  nome: string;
  idPai?: number;
  ativo?: boolean;
}

// Espelha area-conhecimento.request-update.ts. Só nome/ativo - nunca
// codigoCnpq nem idPai, de propósito (ver comentário no DTO Nest).
export interface AreaConhecimentoRequestUpdate {
  nome?: string;
  ativo?: boolean;
}
