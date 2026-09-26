export class UsuarioPapelResponse {
  idUsuario: number;
  idPapel: number;
  nomePapel: string;
  // null = papel valendo normalmente.
  suspensoAte: Date | null;
}
