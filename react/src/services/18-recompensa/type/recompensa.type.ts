import type { TipoRecompensa } from '../../constant/type/enums-do-banco.gerado';

// Espelha nest/src/18-recompensa/dto. Recompensa simbólica: sem estoque e sem entrega.
export interface RecompensaLink {
  idLinkRecompensa: number;
  idTipoLink: number;
  url: string;
}

export interface RecompensaResponse {
  idRecompensa: number;
  idCampanha: number;
  titulo: string;
  descricao: string | null;
  valorMinimo: number;
  tipo: TipoRecompensa;
  ativo: boolean;
  criadoEm: string;
  // Quantas contribuições pagas escolheram (só o dono da campanha e o admin veem o número de verdade).
  escolhidas: number;
  // O link especial: só o dono, o admin e quem ganhou enxergam (para os outros, vazio).
  links: RecompensaLink[];
}

export interface RecompensaRequestCreate {
  idCampanha: number;
  titulo: string;
  descricao?: string;
  valorMinimo: number;
  tipo: TipoRecompensa;
  link?: { idTipoLink: number; url: string };
}

export interface RecompensaRequestUpdate {
  titulo?: string;
  descricao?: string | null;
  valorMinimo?: number;
  tipo?: TipoRecompensa;
  ativo?: boolean;
}

// Uma recompensa que a conta logada ganhou (GET /recompensa/minhas).
export interface RecompensaGanha {
  idRecompensa: number;
  idCampanha: number;
  tituloCampanha: string;
  titulo: string;
  descricao: string | null;
  tipo: TipoRecompensa;
  idContribuicao: number;
  links: RecompensaLink[];
}
