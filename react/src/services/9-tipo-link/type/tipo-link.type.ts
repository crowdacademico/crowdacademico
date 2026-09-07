// Espelha nest/src/9-tipo-link/dto/response/tipo-link.response.ts.
export interface TipoLinkResponse {
  idTipolink: number;
  codigo: string;
  nome: string;
  ativo: boolean;
  dominio: string[];
  regex: string | null;
  permitePerfil: boolean;
  permiteAtualizacao: boolean;
  permiteRecompensa: boolean;
}

// Mesmos valores de ListarTipoLinkQueryDto (Nest) - filtra pelo campo
// permite_* correspondente.
export type EscopoTipoLink = 'perfil' | 'atualizacao' | 'recompensa';

// Espelha tipo-link.request-create.ts.
export interface TipoLinkRequestCreate {
  codigo: string;
  nome: string;
  ativo?: boolean;
  regex?: string | null;
  dominio?: string[];
  permitePerfil?: boolean;
  permiteAtualizacao?: boolean;
  permiteRecompensa?: boolean;
}

// Espelha tipo-link.request-update.ts. Sem `codigo`, de propósito (ver
// comentário no DTO Nest - chave estável que calcular_score_perfil_
// academico() lê).
export interface TipoLinkRequestUpdate {
  nome?: string;
  ativo?: boolean;
  regex?: string | null;
  dominio?: string[];
  permitePerfil?: boolean;
  permiteAtualizacao?: boolean;
  permiteRecompensa?: boolean;
}
