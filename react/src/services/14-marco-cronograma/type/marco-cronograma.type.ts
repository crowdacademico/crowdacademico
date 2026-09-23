// Espelha nest/src/14-marco-cronograma/dto/response/marco-cronograma.response.ts.
// Extraído (23-09-2026) de dentro de bancada-campanha.tsx, mesmo raciocínio
// de orcamento-campanha.type.ts (ver lá).
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
