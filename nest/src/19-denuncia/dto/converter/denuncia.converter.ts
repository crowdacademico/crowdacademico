import type {
  DenunciaEntity,
  StatusCampanha,
  TipoMotivoDenuncia,
} from '../../../commons/database/db.types';
import { DenunciaResponse } from '../response/denuncia.response';

// Os nomes, o motivo e a campanha vêm dos JOINs da consulta (denuncia.service.findall.ts).
export type DenunciaComDetalhes = DenunciaEntity & {
  motivo: string;
  tipo_motivo: TipoMotivoDenuncia;
  nome_denunciante: string | null;
  email_denunciante: string | null;
  titulo_campanha: string | null;
  status_campanha: StatusCampanha | null;
  nome_pesquisador_alvo: string | null;
};

export class DenunciaConverter {
  static paraResponseDto(linha: DenunciaComDetalhes): DenunciaResponse {
    return {
      idDenuncia: linha.id_denuncia,
      idUsuario: linha.id_usuario,
      nomeDenunciante: linha.nome_denunciante,
      emailDenunciante: linha.email_denunciante,
      idCampanhaAlvo: linha.id_campanha_alvo,
      tituloCampanha: linha.titulo_campanha,
      statusCampanha: linha.status_campanha,
      idPesquisadorAlvo: linha.id_pesquisador_alvo,
      nomePesquisadorAlvo: linha.nome_pesquisador_alvo,
      idMotivo: linha.id_motivo,
      motivo: linha.motivo,
      tipoMotivo: linha.tipo_motivo,
      relato: linha.relato,
      status: linha.status,
      justificativaModeracao: linha.justificativa_moderacao,
      contestacao: linha.contestacao,
      contestacaoStatus: linha.contestacao_status,
      contestadaEm: linha.contestada_em,
      justificativaContestacao: linha.justificativa_contestacao,
      criadoEm: linha.criado_em,
    };
  }
}
