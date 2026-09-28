import { Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseService } from '../../commons/database/database.service';
import { DashboardResponseSummary } from '../dto/response/dashboard.response-summary';

// Shape da linha devolvida por contar_metricas_dashboard() (03_funcoes_
// seguranca.sql [03-M]) - mesmo raciocínio de qualquer outra função
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
  campanhas_ativas: number;
  campanhas_sucesso: number;
  campanhas_nao_atingida: number;
  campanhas_aguardando_aprovacao: number;
  // DECIMAL vem como string do driver `pg` (mesmo cuidado de BIGSERIAL em
  // log_auditoria.id_log) - convertido pra number em `executar()` abaixo.
  valor_total_arrecadado: string;
  denuncias_pendentes: number;
  campanhas_para_revisao_score: number;
}

@Injectable()
export class DashboardServiceResumo {
  constructor(private readonly database: DatabaseService) {}

  async executar(): Promise<DashboardResponseSummary> {
    const db = this.database.getDb();

    // `contar_metricas_dashboard()` é SECURITY DEFINER (bypassa a RLS restritiva de usuario/configuracoes de
    // propósito, ver comentário da função no .sql): sem isso, o total mostrado dependeria de quem está logado,
    // errado para um card de "total do sistema".
    //
    // NÃO inclui prévia de log_auditoria aqui: a prévia da seção (c) é sobre notificação pendente, não log de
    // auditoria (log_auditoria já tem o próprio painel "Ver log" embaixo de cada tabela).
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
      // totalCampanhas vem de contar_metricas_dashboard() (03, [03-M]), que conta a tabela de verdade.
      totalCampanhas: metricas.total_campanhas,
      sessoesAtivas: metricas.sessoes_ativas,
      // notificacao (26-notificacao) ainda não existe - ver comentário do DTO.
      notificacoesPendentes: null,
      campanhasAtivas: metricas.campanhas_ativas,
      campanhasSucesso: metricas.campanhas_sucesso,
      campanhasNaoAtingida: metricas.campanhas_nao_atingida,
      campanhasAguardandoAprovacao: metricas.campanhas_aguardando_aprovacao,
      valorTotalArrecadado: Number(metricas.valor_total_arrecadado),
      denunciasPendentes: metricas.denuncias_pendentes,
      campanhasParaRevisaoScore: metricas.campanhas_para_revisao_score,
    };
  }
}
