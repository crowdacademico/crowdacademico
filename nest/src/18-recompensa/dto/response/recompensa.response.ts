import type { TipoRecompensa } from '../../../commons/database/db.types';

export class RecompensaLinkResponse {
  idLinkRecompensa: number;
  idTipoLink: number;
  url: string;
}

export class RecompensaResponse {
  idRecompensa: number;
  idCampanha: number;
  titulo: string;
  descricao: string | null;
  valorMinimo: number;
  tipo: TipoRecompensa;
  ativo: boolean;
  criadoEm: Date;
  // Quantas contribuições pagas escolheram esta recompensa.
  escolhidas: number;
  // Só aparece para quem pode ver (dono da campanha, admin, quem ganhou); para os outros, lista vazia.
  links: RecompensaLinkResponse[];
}

// Uma recompensa que a própria conta ganhou (RF-101), com o link especial dela.
export class RecompensaGanhaResponse {
  idRecompensa: number;
  idCampanha: number;
  tituloCampanha: string;
  titulo: string;
  descricao: string | null;
  tipo: TipoRecompensa;
  idContribuicao: number;
  links: RecompensaLinkResponse[];
}
