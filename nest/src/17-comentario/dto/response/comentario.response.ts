export class ComentarioResponse {
  idComentario: number;
  idCampanha: number;
  idPesquisador: number | null;
  conteudo: string;
  endossado: boolean;
  criadoEm: Date;
  ordemEndosso: number | null;
  ativo: boolean;
  // Só na listagem (GET /comentario); nas outras respostas fica null.
  nomePesquisador: string | null;
  // Só na listagem: a foto de perfil do autor (URL pública), para o bloco Endosso da página da campanha.
  fotoPesquisador: string | null;
}
