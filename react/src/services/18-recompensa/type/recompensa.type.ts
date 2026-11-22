// Espelha nest/src/18-recompensa/dto. Recompensa = o Mural dos apoiadores da campanha (22-11-2026, RF-103 a RF-105):
// uma por campanha, com o valor mínimo e uma mensagem de agradecimento opcional.
export interface RecompensaResponse {
  idRecompensa: number;
  idCampanha: number;
  descricao: string | null;
  valorMinimo: number;
  ativo: boolean;
  criadoEm: string;
}

// Uma pessoa no mural. Sem nome (e sem foto): apoio anônimo, sem conta ou de conta excluída.
export interface ApoiadorMural {
  nome: string | null;
  fotoUrl: string | null;
  apoiouEm: string;
}

// `recompensa` null: a campanha não oferece mural. `travada`: já tem alguém no mural, então o valor mínimo não muda
// mais e a recompensa não sai (o banco recusa, 91067).
export interface MuralResponse {
  recompensa: RecompensaResponse | null;
  apoiadores: ApoiadorMural[];
  travada: boolean;
}

export interface RecompensaRequestCreate {
  idCampanha: number;
  valorMinimo: number;
  descricao?: string | null;
}

export interface RecompensaRequestUpdate {
  valorMinimo?: number;
  descricao?: string | null;
  ativo?: boolean;
}
