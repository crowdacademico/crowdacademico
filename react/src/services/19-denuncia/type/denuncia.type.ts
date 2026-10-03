import type { StatusCampanha, StatusDenuncia, TipoMotivoDenuncia } from '../../constant/type/enums-do-banco.gerado';
export type { StatusDenuncia };

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
  criadoEm: string;
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
