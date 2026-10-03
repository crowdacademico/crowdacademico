import type {
  StatusCampanha,
  StatusDenuncia,
  TipoMotivoDenuncia,
} from '../../../commons/database/db.types';

export class DenunciaResponse {
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
  criadoEm: Date;
}
