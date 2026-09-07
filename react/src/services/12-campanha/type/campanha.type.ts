import type { StatusCampanha } from '../constants/status-campanha.constants';

// Espelha nest/src/commons/database/db.types.ts (MODELOS_CAMPANHA).
export type ModeloCampanha = 'all-or-nothing' | 'flexivel';

// Espelha nest/src/12-campanha/dto/response/campanha.response.ts.
// StatusCampanha reaproveitado da fase 1 (constants/status-campanha.constants.ts).
export interface CampanhaResponse {
  idCampanha: number;
  idUsuario: number;
  idAdmin: number | null;
  idAreaConhecimento: number;
  titulo: string;
  modelo: ModeloCampanha;
  metaFinanceira: number;
  valorBrutoArrecadado: number;
  taxaPlataforma: number | null;
  descricao: string | null;
  dataInicio: string | null;
  dataFim: string | null;
  status: StatusCampanha;
  aprovadoEm: string | null;
  encerradoEm: string | null;
  videoApresentacaoUrl: string | null;
  criadoEm: string;
}
