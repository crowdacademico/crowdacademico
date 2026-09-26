import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Pool } from 'pg';
import { PG_POOL } from '../../commons/database/database.constants';

// Mesmo padrão de CampanhaServiceEncerrarVencidas (12-campanha): reativar_pesquisadores_vencidos()
// (05_regras_negocio.sql) precisa de alguém chamando periodicamente, senão a suspensão do PODER de pesquisador
// (suspender_pesquisador(), 03) nunca expiraria sozinha mesmo com o prazo já vencido.
//
// `PG_POOL` direto, NUNCA `DatabaseService.getDb()`: mesmo motivo de CampanhaServiceEncerrarVencidas (job
// agendado roda fora do pipeline HTTP, sem GlobalDbInterceptor por trás). A função é SECURITY DEFINER, não
// precisa de `app.id_usuario_atual` setado.
//
// Mesma limitação conhecida e aceita de CampanhaServiceEncerrarVencidas (DOCUMENTACAO_BACKEND.md §7.4): só
// dispara enquanto o processo do Nest estiver de pé; hospedagem gratuita que "dorme" sem tráfego atrasa a
// reativação até o servidor acordar de novo, nunca perde ela para sempre.
@Injectable()
export class PerfilPesquisadorServiceReativarVencidos {
  private readonly logger = new Logger(
    PerfilPesquisadorServiceReativarVencidos.name,
  );

  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  // Mesmo intervalo de CampanhaServiceEncerrarVencidas (15 min) - varredura
  // simples por status_pesquisador + suspenso_ate, barata.
  @Cron('*/15 * * * *')
  async executar(): Promise<void> {
    // try/catch: sem ele, uma exceção vinda da função SQL vira `unhandledRejection` (o @Cron chama este método
    // sem `await` de ninguém), e o Node moderno derruba o processo inteiro por causa de um job periódico. Mesmo
    // tratamento nos 3 crons do sistema.
    try {
      const resultado = await this.pool.query<{
        reativar_pesquisadores_vencidos: number;
      }>('SELECT public.reativar_pesquisadores_vencidos()');
      const quantidade =
        resultado.rows[0]?.reativar_pesquisadores_vencidos ?? 0;

      if (quantidade > 0) {
        this.logger.log(
          `${quantidade} pesquisador(es) reativado(s) automaticamente (prazo de suspensão vencido).`,
        );
      }
    } catch (erro) {
      this.logger.error(
        `Falha ao reativar pesquisadores suspensos: ${erro instanceof Error ? erro.message : String(erro)}`,
      );
    }
  }
}
