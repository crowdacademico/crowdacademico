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
