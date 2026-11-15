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

// Uma recompensa que a própria conta ganhou (RF-105), com o link especial dela.
export class RecompensaGanhaResponse {
  idRecompensa: number;
  idCampanha: number;
  tituloCampanha: string;
  titulo: string;
  descricao: string | null;
  tipo: TipoRecompensa;
  idContribuicao: number;
  // A recompensa vale (recompensa_liberada, 03): no Tudo ou Nada, só depois que a campanha bate a meta. Sem isso, o link
  // não vem (a RLS esconde) e a tela diz "libera quando a campanha bater a meta".
  liberada: boolean;
  links: RecompensaLinkResponse[];
}

// Quem ganhou uma recompensa, para o dono da campanha (listar_ganhadores_recompensa, 05). Só o nome.
export class RecompensaGanhadorResponse {
  idContribuicao: number;
  // O nome, ou "Apoiador anônimo".
  apoiador: string;
  valor: number;
  ganhaEm: Date;
  liberada: boolean;
}
