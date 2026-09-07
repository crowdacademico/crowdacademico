// Espelha nest/src/25-arquivo/dto/response/*.ts.

// Espelha arquivo.response.ts (ArquivoResponse).
export interface ArquivoResponse {
  idArquivo: number;
  url: string;
  nomeOriginal: string;
  tipoMime: string;
  tamanhoBytes: number;
  ativo: boolean;
  criadoEm: string;
  desativadoEm: string | null;
}

// Espelha arquivo.response-upload-iniciado.ts (ArquivoResponseUploadIniciado).
export interface ArquivoResponseUploadIniciado {
  chave: string;
  urlUpload: string;
  metodo: 'PUT';
  cabecalhosObrigatorios: Record<string, string>;
  expiraEm: string;
}

// Espelha AvatarResolvido (arquivo.service.resolver-avatar.ts) - não é um
// DTO formal de dto/response/, mas é o formato real que
// GET /arquivo/avatar/:idUsuario devolve.
export interface AvatarResolvido {
  url: string | null;
}
