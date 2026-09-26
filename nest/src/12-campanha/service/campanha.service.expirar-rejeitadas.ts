import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Pool } from 'pg';
import { PG_POOL } from '../../commons/database/database.constants';

// Exclui campanhas REJEITADAS cujo prazo de reenvio venceu (ciclo de rejeição e reenvio, ver REQUISITOS_V7).
// Cada rejeição dá ao pesquisador `configuracoes.campanha_rejeitada_prazo_dias` (30 dias) para corrigir e
// reenviar, contados da ÚLTIMA rejeição. Sem reenvio nesse prazo, a campanha some, e o histórico de rejeições
// dela permanece (não tem FK para campanha).
//
// Mesmo molde de CampanhaServiceExpirarRascunho (mesma pasta): `PG_POOL` direto porque o job roda fora do
// pipeline HTTP, função SECURITY DEFINER.
@Injectable()
export class CampanhaServiceExpirarRejeitadas {
  private readonly logger = new Logger(CampanhaServiceExpirarRejeitadas.name);

  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  // 1x por hora: o prazo é medido em dias, atrasar 1h não machuca ninguém.
  @Cron('0 * * * *')
  async executar(): Promise<void> {
    // try/catch: sem ele, uma exceção da função SQL vira unhandledRejection e o
    // Node moderno derruba o processo por causa de um job de limpeza. Mesmo
    // tratamento dos outros jobs agendados do sistema.
    try {
      const resultado = await this.pool.query<{
        expirar_campanhas_rejeitadas: number;
      }>('SELECT public.expirar_campanhas_rejeitadas()');
      const quantidade = resultado.rows[0]?.expirar_campanhas_rejeitadas ?? 0;

      if (quantidade > 0) {
        this.logger.log(
          `${quantidade} campanha(s) rejeitada(s) excluída(s) por prazo de reenvio vencido.`,
        );
      }
    } catch (erro) {
      this.logger.error(
        `Falha ao expirar campanhas rejeitadas: ${erro instanceof Error ? erro.message : String(erro)}`,
      );
    }
  }
}
