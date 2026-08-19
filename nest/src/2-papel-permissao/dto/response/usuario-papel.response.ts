export class UsuarioPapelResponse {
  idUsuario: number;
  idPapel: number;
  nomePapel: string;
  // ADICIONADO (09-08-2026, Bloco G) — null = papel valendo normalmente.
  suspensoAte: Date | null;
}
