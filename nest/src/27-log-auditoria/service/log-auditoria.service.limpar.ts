import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Pool } from 'pg';
import { PG_POOL } from '../../commons/database/database.constants';

// Apaga log_auditoria mais velho que `configuracoes.log_auditoria_retencao_dias`
// (365 dias; 0 = guardar para sempre). Sem este job a tabela só cresce. A regra
// inteira mora na função SQL `limpar_log_auditoria()` (SECURITY DEFINER, 05 [05-L]),
// que também deixa uma linha de rastro quando apaga algo; aqui só agenda e loga.
//
// Mesmo molde dos jobs de campanha (`PG_POOL` direto, porque o job roda fora do
// pipeline HTTP e sem sessão de usuário).
@Injectable()
export class LogAuditoriaServiceLimpar {
  private readonly logger = new Logger(LogAuditoriaServiceLimpar.name);

  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  // 1x por dia, de madrugada: o prazo é medido em dias e o DELETE é o único
  // trabalho pesado, então convém fora do horário de uso.
  @Cron('0 3 * * *')
  async executar(): Promise<void> {
    // try/catch: sem ele, uma exceção da função SQL vira unhandledRejection e o
    // Node moderno derruba o processo por causa de um job de limpeza.
    try {
      const resultado = await this.pool.query<{ limpar_log_auditoria: number }>(
        'SELECT public.limpar_log_auditoria()',
      );
      const quantidade = resultado.rows[0]?.limpar_log_auditoria ?? 0;

      if (quantidade > 0) {
        this.logger.log(
          `${quantidade} registro(s) de log_auditoria apagado(s) por passar do prazo de retenção.`,
        );
      }
    } catch (erro) {
      this.logger.error(
        `Falha ao limpar log_auditoria: ${erro instanceof Error ? erro.message : String(erro)}`,
      );
    }
  }
}
