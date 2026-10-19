import type { OperacaoLogAuditoria } from '../../../commons/database/db.types';

export class LogAuditoriaResponse {
  idLog: number;
  tabela: string;
  identidadeRegistro: string;
  operacao: OperacaoLogAuditoria;
  idUsuarioResponsavel: number | null;
  // Join com usuario (LEFT - precisa continuar aparecendo mesmo se o
  // responsável for NULL, ou se a conta dele já tiver sido excluída).
  nomeResponsavel: string | null;
  camposAlterados: string[] | null;
  dadosAnteriores: Record<string, unknown> | null;
  dadosNovos: Record<string, unknown> | null;
  ocorridoEm: Date;
}
