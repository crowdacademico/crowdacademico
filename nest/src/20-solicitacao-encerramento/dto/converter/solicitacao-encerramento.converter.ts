import type {
  ModeloCampanha,
  SolicitacaoEncerramentoEntity,
  StatusCampanha,
} from '../../../commons/database/db.types';
import { SolicitacaoEncerramentoResponse } from '../response/solicitacao-encerramento.response';

// Os dados da campanha, os nomes e a contagem vêm da consulta (solicitacao-encerramento.util.with-details.ts).
export type SolicitacaoComDetalhes = SolicitacaoEncerramentoEntity & {
  titulo_campanha: string | null;
  status_campanha: StatusCampanha | null;
  modelo_campanha: ModeloCampanha | null;
  valor_arrecadado: string | number | null;
  id_pesquisador: number | null;
  nome_pesquisador: string | null;
  nome_admin: string | null;
  contribuicoes_confirmadas: string | number | null;
};

export class SolicitacaoEncerramentoConverter {
  static paraResponseDto(
    linha: SolicitacaoComDetalhes,
  ): SolicitacaoEncerramentoResponse {
    return {
      idSolicitacao: linha.id_solicitacao_encerramento,
      idCampanha: linha.id_campanha,
      tituloCampanha: linha.titulo_campanha,
      statusCampanha: linha.status_campanha,
      modeloCampanha: linha.modelo_campanha,
      valorArrecadado:
        linha.valor_arrecadado === null ? null : Number(linha.valor_arrecadado),
      contribuicoesConfirmadas: Number(linha.contribuicoes_confirmadas ?? 0),
      idPesquisador: linha.id_pesquisador,
      nomePesquisador: linha.nome_pesquisador,
      justificativaPesquisador: linha.justificativa_pesquisador,
      status: linha.status,
      idAdmin: linha.id_admin,
      nomeAdmin: linha.nome_admin,
      justificativaAdmin: linha.justificativa_admin,
      solicitadoEm: linha.solicitado_em,
      avaliadoEm: linha.avaliado_em,
    };
  }
}
