import type { ModeloCampanha, StatusCampanha, StatusEncerramento } from '../../constant/type/enums-do-banco.gerado';
export type { StatusEncerramento };

// Espelha nest/src/20-solicitacao-encerramento/dto/response/solicitacao-encerramento.response.ts.
export interface SolicitacaoEncerramentoResponse {
  idSolicitacao: number;
  idCampanha: number;
  tituloCampanha: string | null;
  statusCampanha: StatusCampanha | null;
  modeloCampanha: ModeloCampanha | null;
  valorArrecadado: number | null;
  contribuicoesConfirmadas: number;
  idPesquisador: number | null;
  nomePesquisador: string | null;
  justificativaPesquisador: string | null;
  status: StatusEncerramento;
  // Vazio num pedido aprovado = encerrado pelo próprio pesquisador, sem contribuição confirmada.
  idAdmin: number | null;
  nomeAdmin: string | null;
  justificativaAdmin: string | null;
  solicitadoEm: string;
  avaliadoEm: string | null;
}

export interface FiltroSolicitacaoEncerramento {
  status?: StatusEncerramento;
  idCampanha?: number;
}
