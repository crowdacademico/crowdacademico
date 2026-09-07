// Espelha nest/src/8-area-conhecimento/dto/response/area-conhecimento.response.ts.
export interface AreaConhecimentoResponse {
  idAreaConhecimento: number;
  codigoCnpq: string;
  nome: string;
  idPai: number | null;
  nomePai: string | null;
  ativo: boolean;
}
