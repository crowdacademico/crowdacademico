import type { StatusCampanha } from '../constants/status-campanha.constants';

// Espelha nest/src/commons/database/db.types.ts (MODELOS_CAMPANHA).
export type ModeloCampanha = 'all-or-nothing' | 'flexivel';

// Espelha nest/src/12-campanha/dto/response/campanha.response.ts.
// StatusCampanha reaproveitado da fase 1 (constants/status-campanha.constants.ts).
export interface CampanhaResponse {
  idCampanha: number;
  idUsuario: number;
  idAdmin: number | null;
  idAreaConhecimento: number;
  titulo: string;
  modelo: ModeloCampanha;
  metaFinanceira: number;
  valorBrutoArrecadado: number;
  taxaPlataforma: number | null;
  descricao: string | null;
  dataInicio: string | null;
  dataFim: string | null;
  status: StatusCampanha;
  aprovadoEm: string | null;
  encerradoEm: string | null;
  videoApresentacaoUrl: string | null;
  criadoEm: string;
}

// Espelha nest/src/21-historico-rejeicao/dto/response/historico-rejeicao.response.ts.
// "Onde fica registrado" o motivo de uma campanha ter sido rejeitada
// (14-09-2026, pedido do Lucas) - mesma ideia de UsuarioResponseTermoAceito
// (usuario.type.ts), mas do lado de campanha em vez de usuário.
export interface HistoricoRejeicaoResponse {
  idRejeicao: number;
  nomeAdmin: string | null;
  justificativa: string | null;
  rejeitadoEm: string;
}
