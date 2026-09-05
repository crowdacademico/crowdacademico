import { LogAuditoriaResponse } from '../response/log-auditoria.response';

// Shape exata do SELECT de log-auditoria.service.findall.ts (join com
// usuario) - não é um `Selectable<LogAuditoriaTable>` puro por causa do
// `nome_responsavel` (vem de `usuario.nome`, não de log_auditoria).
interface LogAuditoriaParaConverter {
  id_log: string;
  tabela: string;
  identidade_registro: string;
  operacao: string;
  id_usuario_responsavel: number | null;
  nome_responsavel: string | null;
  campos_alterados: string[] | null;
  dados_anteriores: Record<string, unknown> | null;
  dados_novos: Record<string, unknown> | null;
  ocorrido_em: Date;
}

export class LogAuditoriaConverter {
  static paraResponseDto(
    linha: LogAuditoriaParaConverter,
  ): LogAuditoriaResponse {
    return {
      // id_log vem como string do driver (BIGSERIAL/bigint) - ver
      // comentário em commons/database/db.types.ts.
      idLog: Number(linha.id_log),
      tabela: linha.tabela,
      identidadeRegistro: linha.identidade_registro,
      operacao: linha.operacao,
      idUsuarioResponsavel: linha.id_usuario_responsavel,
      nomeResponsavel: linha.nome_responsavel,
      camposAlterados: linha.campos_alterados,
      dadosAnteriores: linha.dados_anteriores,
      dadosNovos: linha.dados_novos,
      ocorridoEm: linha.ocorrido_em,
    };
  }
}
