// Espelha ComentarioResponse (nest/src/17-comentario/dto/response/comentario.response.ts).
export interface ComentarioResponse {
  idComentario: number;
  idCampanha: number;
  // `null`: o autor pode não existir mais (conta excluída/anonimizada).
  idPesquisador: number | null;
  conteudo: string;
  endossado: boolean;
  criadoEm: string;
  ordemEndosso: number | null;
  ativo: boolean;
  // Só na listagem; `null` também quando a conta do autor foi excluída.
  nomePesquisador: string | null;
}
