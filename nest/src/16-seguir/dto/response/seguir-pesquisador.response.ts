export class SeguirPesquisadorResponse {
  idSegPesquisador: number;
  idUsuario: number;
  idPesquisador: number;
  nomePesquisador: string | null;
  seguidoEm: Date;
}

export class SeguidoresPesquisadorResponse {
  idPesquisador: number;
  seguidores: number;
}
