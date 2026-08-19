import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { LogAuditoriaConverter } from '../dto/converter/log-auditoria.converter';
import { LogAuditoriaResponse } from '../dto/response/log-auditoria.response';

// Últimas N ações do PRÓPRIO usuário logado, de QUALQUER tabela — usado
// pelo sino "Atividade recente" do cabeçalho (09-08-2026, Bloco B/C do
// prompt do Claude Web). Diferente de LogAuditoriaServiceFindAll (que
// filtra por `tabela`, uma de cada vez, pro botão "Ver log" embaixo de
// cada listagem): aqui não recebe `tabela` nenhuma, só limita quantidade —
// é "o que EU fiz recentemente", não "o histórico de uma tabela".
//
// pol_log_auditoria_select (04_rls_policies.sql [04-L]) foi ampliada nesta
// mesma rodada pra deixar qualquer usuário ver as próprias linhas (antes
// só existia log_visualizar, visão administrativa) — sem essa mudança de
// RLS aplicada no banco, esta query volta vazia pra quem não tem
// log_visualizar, mesmo sendo o autor das próprias linhas.
const LIMITE_ATIVIDADE_RECENTE = 10;

@Injectable()
export class LogAuditoriaServiceMinhaAtividade {
  constructor(private readonly database: DatabaseService) {}

  async executar(idUsuario: number): Promise<LogAuditoriaResponse[]> {
    const linhas = await this.database
      .getDb()
      .selectFrom('log_auditoria')
      .leftJoin(
        'usuario',
        'usuario.id_usuario',
        'log_auditoria.id_usuario_responsavel',
      )
      .select([
        'log_auditoria.id_log',
        'log_auditoria.tabela',
        'log_auditoria.identidade_registro',
        'log_auditoria.operacao',
        'log_auditoria.id_usuario_responsavel',
        'usuario.nome as nome_responsavel',
        'log_auditoria.campos_alterados',
        'log_auditoria.dados_anteriores',
        'log_auditoria.dados_novos',
        'log_auditoria.ocorrido_em',
      ])
      .where('log_auditoria.id_usuario_responsavel', '=', idUsuario)
      .orderBy('log_auditoria.ocorrido_em', 'desc')
      .limit(LIMITE_ATIVIDADE_RECENTE)
      .execute();

    return linhas.map((linha) => LogAuditoriaConverter.paraResponseDto(linha));
  }
}
