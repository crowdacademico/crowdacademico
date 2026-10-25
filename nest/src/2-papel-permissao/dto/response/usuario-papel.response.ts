export class UsuarioPapelResponse {
  idUsuario: number;
  idPapel: number;
  nomePapel: string;
  // Fixo (o nome é renomeável): é por ele que a tela reconhece o papel padrão 'usuario'.
  codigoPapel: string;
  // Posição do papel nas listas (1 = maior cargo).
  ordemExibicao: number;
  // null = papel valendo normalmente.
  suspensoAte: Date | null;
}
