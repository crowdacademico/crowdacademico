// Espelha nest/src/14-marco-cronograma/dto/response/marco-cronograma.response.ts, mesmo raciocínio de
// orcamento-campanha.type.ts (ver lá).
export interface MarcoCronogramaResponse {
  idMarco: number;
  idCampanha: number;
  titulo: string;
  descricao: string | null;
  dataPrevista: string;
  ordem: number;
  criadoEm: string;
}

export interface MarcoCronogramaRequestCreate {
  idCampanha: number;
  titulo: string;
  descricao?: string;
  dataPrevista: string;
  ordem?: number;
}

export interface MarcoCronogramaRequestUpdate {
  titulo: string;
  descricao?: string;
  dataPrevista: string;
  ordem?: number;
}
