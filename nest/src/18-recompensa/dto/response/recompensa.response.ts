export class RecompensaResponse {
  idRecompensa: number;
  idCampanha: number;
  descricao: string | null;
  valorMinimo: number;
  ativo: boolean;
  criadoEm: Date;
}

// Uma pessoa no Mural dos apoiadores. Sem nome (e sem foto): apoio anônimo, sem conta ou de conta excluída. O valor que
// cada um deu não sai daqui.
export class ApoiadorMuralResponse {
  nome: string | null;
  fotoUrl: string | null;
  apoiouEm: Date;
}

// A página pública da campanha: a recompensa (null = a campanha não oferece mural) e quem está nele.
// `travada`: já tem alguém no mural, então o valor mínimo não muda mais (fn_recompensa_trava, 05).
export class MuralResponse {
  recompensa: RecompensaResponse | null;
  apoiadores: ApoiadorMuralResponse[];
  travada: boolean;
}
