// Espelha nest/src/commons/database/db.types.ts / CK_LOG_AUDITORIA_OPERACAO.
export type OperacaoLogAuditoria = 'INSERT' | 'UPDATE' | 'DELETE' | 'EXPORT';

// Espelha nest/src/27-log-auditoria/dto/response/log-auditoria.response.ts.
export interface LogAuditoriaResponse {
  idLog: number;
  tabela: string;
  identidadeRegistro: string;
  operacao: OperacaoLogAuditoria;
  idUsuarioResponsavel: number | null;
  nomeResponsavel: string | null;
  camposAlterados: string[] | null;
  dadosAnteriores: Record<string, unknown> | null;
  dadosNovos: Record<string, unknown> | null;
  ocorridoEm: string;
}
