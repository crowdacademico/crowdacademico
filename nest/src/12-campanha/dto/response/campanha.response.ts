import type {
  ModeloCampanha,
  StatusCampanha,
} from '../../../commons/database/db.types';

export class CampanhaResponse {
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
  dataInicio: Date | null;
  dataFim: Date | null;
  status: StatusCampanha;
  aprovadoEm: Date | null;
  encerradoEm: Date | null;
  videoApresentacaoUrl: string | null;
  criadoEm: Date;
}
