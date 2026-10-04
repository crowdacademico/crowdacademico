import type {
  StatusContestacao,
  StatusDenuncia,
} from '../../../commons/database/db.types';

// Uma denúncia procedente contra o pesquisador logado (contra o perfil ou contra uma campanha dele), sem quem
// denunciou, com a contestação quando houver (RF-033).
export class DenunciaContraMimResponse {
  idDenuncia: number;
  idCampanhaAlvo: number | null;
  tituloCampanha: string | null;
  motivo: string;
  status: StatusDenuncia;
  justificativaModeracao: string | null;
  criadoEm: Date;
  contestacao: string | null;
  contestacaoStatus: StatusContestacao | null;
  contestadaEm: Date | null;
  justificativaContestacao: string | null;
}
