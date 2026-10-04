import type {
  ModeloCampanha,
  StatusCampanha,
  StatusEncerramento,
} from '../../../commons/database/db.types';

export class SolicitacaoEncerramentoResponse {
  idSolicitacao: number;
  idCampanha: number;
  tituloCampanha: string | null;
  statusCampanha: StatusCampanha | null;
  modeloCampanha: ModeloCampanha | null;
  valorArrecadado: number | null;
  // Contribuições confirmadas (ou já repassadas) da campanha, para quem decide (RF-065).
  contribuicoesConfirmadas: number;
  idPesquisador: number | null;
  nomePesquisador: string | null;
  justificativaPesquisador: string | null;
  status: StatusEncerramento;
  // Vazio num pedido aprovado = encerrado pelo próprio pesquisador, sem contribuição confirmada.
  idAdmin: number | null;
  nomeAdmin: string | null;
  justificativaAdmin: string | null;
  solicitadoEm: Date;
  avaliadoEm: Date | null;
}
