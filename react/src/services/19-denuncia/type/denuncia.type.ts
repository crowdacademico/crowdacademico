import type { StatusCampanha, StatusContestacao, StatusDenuncia, TipoMotivoDenuncia } from '../../constant/type/enums-do-banco.gerado';
export type { StatusContestacao, StatusDenuncia };

// Espelha nest/src/19-denuncia/dto/response/denuncia.response.ts.
export interface DenunciaResponse {
  idDenuncia: number;
  idUsuario: number;
  nomeDenunciante: string | null;
  emailDenunciante: string | null;
  idCampanhaAlvo: number | null;
  tituloCampanha: string | null;
  statusCampanha: StatusCampanha | null;
  idPesquisadorAlvo: number | null;
  nomePesquisadorAlvo: string | null;
  idMotivo: number;
  motivo: string;
  tipoMotivo: TipoMotivoDenuncia;
  relato: string | null;
  status: StatusDenuncia;
  justificativaModeracao: string | null;
  // Contestação do pesquisador penalizado (RF-033), quando houver.
  contestacao: string | null;
  contestacaoStatus: StatusContestacao | null;
  contestadaEm: string | null;
  justificativaContestacao: string | null;
  criadoEm: string;
}

// Espelha denuncia-contra-mim.response.ts: o que o pesquisador vê das denúncias procedentes contra ele, sem quem
// denunciou.
export interface DenunciaContraMimResponse {
  idDenuncia: number;
  idCampanhaAlvo: number | null;
  tituloCampanha: string | null;
  motivo: string;
  status: StatusDenuncia;
  justificativaModeracao: string | null;
  criadoEm: string;
  contestacao: string | null;
  contestacaoStatus: StatusContestacao | null;
  contestadaEm: string | null;
  justificativaContestacao: string | null;
}

// Espelha denuncia.request-create.ts: exatamente um alvo.
export type AlvoDenuncia = { idCampanhaAlvo: number; idPesquisadorAlvo?: never } | { idPesquisadorAlvo: number; idCampanhaAlvo?: never };

export type DenunciaRequestCreate = AlvoDenuncia & {
  idMotivo: number;
  relato?: string;
};

export interface FiltroDenuncia {
  tipo?: TipoMotivoDenuncia;
  status?: StatusDenuncia;
  idCampanha?: number;
  idPesquisador?: number;
}
