import { Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseService } from '../../commons/database/database.service';
import { DashboardResponseSummary } from '../dto/response/dashboard.response-summary';

// Shape da linha devolvida por contar_metricas_dashboard() (03_funcoes_
// seguranca.sql [03-M]) — mesmo raciocínio de qualquer outra função
// SECURITY DEFINER chamada via `sql` template (Kysely não tipa chamada de
// função de banco automaticamente, só SELECT/INSERT/UPDATE/DELETE normais).
interface LinhaMetricasDashboard {
  total_usuarios: number;
  total_pesquisadores: number;
  total_papeis: number;
  total_permissoes: number;
  total_configuracoes: number;
  total_campanhas: number;
  sessoes_ativas: number;
}

@Injectable()
export class DashboardServiceResumo {
  constructor(private readonly database: DatabaseService) {}

  async executar(): Promise<DashboardResponseSummary> {
    const db = this.database.getDb();

    // `contar_metricas_dashboard()` é SECURITY DEFINER (bypassa a RLS
    // restritiva de usuario/configuracoes de propósito, ver comentário da
    // função no .sql) — sem isso, o total mostrado dependeria de quem
    // está logado, errado pra um card de "total do sistema".
    //
    // NÃO inclui prévia de log_auditoria aqui (08-08-2026, correção do
    // Lucas: o pedido original falou em "notificações pendentes" na faixa
    // de saúde — a prévia da seção (c) era pra ser sobre notificação, não
    // log de auditoria; log_auditoria já tem seu próprio painel "Ver log"
    // embaixo de cada tabela, não precisa duplicar aqui).
    const resultado = await sql<LinhaMetricasDashboard>`
      SELECT * FROM contar_metricas_dashboard()
    `.execute(db);
    const metricas = resultado.rows[0];

    return {
      totalUsuarios: metricas.total_usuarios,
      totalPesquisadores: metricas.total_pesquisadores,
      totalPapeis: metricas.total_papeis,
      totalPermissoes: metricas.total_permissoes,
      totalConfiguracoes: metricas.total_configuracoes,
      // ERA `null` fixo (comentário "campanha ainda não existe") — o
      // módulo 12-campanha passou a existir em 22-08-2026, e
      // contar_metricas_dashboard() (03, [03-M]) foi atualizada em
      // 23-08-2026 pra contar a tabela de verdade. Achado pelo Lucas
      // usando o Campo de Testes ("por que o contador não começou a
      // funcionar sozinho?").
      totalCampanhas: metricas.total_campanhas,
      sessoesAtivas: metricas.sessoes_ativas,
      // notificacao (26-notificacao) ainda não existe — ver comentário do DTO.
      notificacoesPendentes: null,
    };
  }
}
