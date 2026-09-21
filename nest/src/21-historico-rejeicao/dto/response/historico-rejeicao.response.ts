export class HistoricoRejeicaoResponse {
  idRejeicao: number;
  idUsuarioDono: number;
  tituloCampanha: string;
  nomeAdmin: string | null;
  justificativa: string | null;
  rejeitadoEm: Date;
}
