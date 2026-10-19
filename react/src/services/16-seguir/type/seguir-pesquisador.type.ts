// Espelha nest/src/16-seguir/dto/response/seguir-pesquisador.response.ts (RF-028).
export interface SeguirPesquisadorResponse {
  idSegPesquisador: number;
  idUsuario: number;
  idPesquisador: number;
  nomePesquisador: string | null;
  seguidoEm: string;
}

export interface SeguidoresPesquisadorResponse {
  idPesquisador: number;
  seguidores: number;
}
