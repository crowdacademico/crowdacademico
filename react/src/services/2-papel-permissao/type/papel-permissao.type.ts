// Espelha nest/src/2-papel-permissao/dto/response/*.ts.

// Espelha papel.response.ts.
export interface PapelResponse {
  idPapel: number;
  nome: string;
}

// Espelha papel.request-update.ts.
export interface PapelRequestUpdate {
  nome: string;
}

// Espelha permissao.response.ts.
export interface PermissaoResponse {
  idPermissao: number;
  nome: string;
}

// Espelha papel-permissao.response.ts.
export interface PapelPermissaoResponse {
  idPapel: number;
  nomePapel: string;
  idPermissao: number;
  nomePermissao: string;
}

// Espelha usuario-papel.response.ts.
export interface UsuarioPapelResponse {
  idUsuario: number;
  idPapel: number;
  nomePapel: string;
  suspensoAte: string | null;
}
