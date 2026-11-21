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
  // Excluído e bloqueado pelo dono da campanha: o autor não comenta mais nela.
  bloqueado: boolean;
  // Só na listagem; `null` também quando a conta do autor foi excluída.
  nomePesquisador: string | null;
  // Só na listagem: URL da foto de perfil do autor (null = sem foto).
  fotoPesquisador: string | null;
}

// A tela Comentários da moderação (GET /comentario/moderacao).
export interface ComentarioModeracaoResponse extends ComentarioResponse {
  tituloCampanha: string | null;
}

export interface ComentarioMeuResponse {
  idComentario: number;
  idCampanha: number;
  tituloCampanha: string;
  idPesquisador: number | null;
  conteudo: string;
  endossado: boolean;
  criadoEm: string;
  ordemEndosso: number | null;
  ativo: boolean;
}
