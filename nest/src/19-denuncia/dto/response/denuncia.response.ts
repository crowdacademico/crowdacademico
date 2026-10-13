import type {
  StatusCampanha,
  StatusContestacao,
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
  // Quem julgou (procedente ou improcedente); vazio enquanto não julgada ou se a conta foi excluída.
  idJulgador: number | null;
  nomeJulgador: string | null;
  julgadoEm: Date | null;
  // Contestação do pesquisador penalizado (RF-033), quando houver.
  contestacao: string | null;
  contestacaoStatus: StatusContestacao | null;
  contestadaEm: Date | null;
  justificativaContestacao: string | null;
  // Quem decidiu a contestação; vazio enquanto espera análise ou se a conta foi excluída.
  idJulgadorContestacao: number | null;
  nomeJulgadorContestacao: string | null;
  criadoEm: Date;
}
