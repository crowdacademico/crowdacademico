import { Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseService } from '../../commons/database/database.service';
import { AutorizacaoService } from '../../commons/seguranca/autorizacao.service';
import {
  MENSAGEM_SEM_PERMISSAO_NOTIFICACAO,
  PERMISSAO_NOTIFICACAO,
} from '../constants/notificacao.constants';
import { NotificacaoResponseSummary } from '../dto/response/notificacao.response';

// Os números do cartão "Notificações" do Dashboard e do topo da aba: o que espera, o que falhou (pede ação) e o que
// saiu na última semana.
@Injectable()
export class NotificacaoServiceSummary {
  constructor(
    private readonly database: DatabaseService,
    private readonly autorizacao: AutorizacaoService,
  ) {}

  async executar(): Promise<NotificacaoResponseSummary> {
    await this.autorizacao.exigirPermissao(
      PERMISSAO_NOTIFICACAO,
      MENSAGEM_SEM_PERMISSAO_NOTIFICACAO,
    );
    const resultado = await sql<{
      pendentes: number;
      falhas: number;
      enviados: number;
      cancelados: number;
    }>`
      SELECT count(*) FILTER (WHERE status = 'pendente')::int AS pendentes,
             count(*) FILTER (WHERE status = 'falhou')::int AS falhas,
             count(*) FILTER (WHERE status = 'enviado' AND enviado_em > NOW() - INTERVAL '7 days')::int AS enviados,
             count(*) FILTER (WHERE status = 'cancelado')::int AS cancelados
      FROM notificacao
    `.execute(this.database.getDb());
    const linha = resultado.rows[0];
    return {
      pendentes: linha.pendentes,
      falhas: linha.falhas,
      enviadosUltimos7Dias: linha.enviados,
      cancelados: linha.cancelados,
    };
  }
}
