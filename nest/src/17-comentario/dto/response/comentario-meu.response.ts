export class ComentarioMeuResponse {
  idComentario: number;
  idCampanha: number;
  tituloCampanha: string;
  idPesquisador: number | null;
  conteudo: string;
  endossado: boolean;
  criadoEm: Date;
  ordemEndosso: number | null;
  ativo: boolean;
}
