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

// Espelha nest/src/25-arquivo/arquivo.constants.ts (CONTEXTOS_ARQUIVO) - só
// decide o teto de redimensionamento em confirmar-upload, não é conferido
// contra nada físico do arquivo.
export type ContextoArquivo = 'avatar' | 'campanha' | 'atualizacao';

// Espelha arquivo.request-iniciar-upload.ts. `tipoMime` é `string` aqui
// (não união literal de TIPOS_MIME_PERMITIDOS), mesma simplificação já
// usada em ArquivoResponse.tipoMime (Fase 2).
export interface ArquivoRequestIniciarUpload {
  nomeOriginal: string;
  tipoMime: string;
  tamanhoBytes: number;
}

// Espelha arquivo.request-confirmar-upload.ts.
export interface ArquivoRequestConfirmarUpload {
  chave: string;
  nomeOriginal: string;
  tipoMime: string;
  tamanhoBytes: number;
  contexto: ContextoArquivo;
}
