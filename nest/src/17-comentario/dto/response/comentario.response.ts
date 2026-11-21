export class ComentarioResponse {
  idComentario: number;
  idCampanha: number;
  idPesquisador: number | null;
  conteudo: string;
  endossado: boolean;
  criadoEm: Date;
  ordemEndosso: number | null;
  ativo: boolean;
  // Excluído e bloqueado pelo dono da campanha: o autor não comenta mais nela (fn_comentario_bloqueio, 05).
  bloqueado: boolean;
  // Só na listagem (GET /comentario); nas outras respostas fica null.
  nomePesquisador: string | null;
  // Só na listagem: a foto de perfil do autor (URL pública), para o bloco Endosso da página da campanha.
  fotoPesquisador: string | null;
}

// A tela Comentários da moderação: o comentário com o título da campanha (null se a campanha não existir mais).
export class ComentarioModeracaoResponse extends ComentarioResponse {
  tituloCampanha: string | null;
}
