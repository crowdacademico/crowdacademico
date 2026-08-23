export class ComentarioResponse {
  idComentario: number;
  idCampanha: number;
  idPesquisador: number | null;
  conteudo: string;
  endossado: boolean;
  criadoEm: Date;
  ordemEndosso: number | null;
  ativo: boolean;
}
