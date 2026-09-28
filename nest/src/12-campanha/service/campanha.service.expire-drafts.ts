import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Pool } from 'pg';
import { PG_POOL } from '../../commons/database/database.constants';

// Apaga rascunhos de campanha abandonados. A campanha nasce 'rascunho' no 1º clique de Criar e só vai para a
// fila de aprovação pelo botão "Enviar para aprovação". Se a pessoa nunca voltar (queda de energia, aba
// fechada, desistência), o rascunho some sozinho depois do prazo em `configuracoes.campanha_rascunho_ttl_horas`
// (336h, 14 dias); sem este job, ficaria para sempre.
//
// Mesmo padrão de CampanhaServiceEncerrarVencidas (mesma pasta): `PG_POOL` direto (job agendado roda fora do
// pipeline HTTP, sem GlobalDbInterceptor para abrir transação/CLS), função SECURITY DEFINER (bypassa RLS de
// propósito, não precisa de app.id_usuario_atual setado).
@Injectable()
export class CampanhaServiceExpirarRascunho {
  private readonly logger = new Logger(CampanhaServiceExpirarRascunho.name);

  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  // 1x por hora - o prazo de graça é medido em horas (336h padrão,
  // `configuracoes.campanha_rascunho_ttl_horas`), não precisa da mesma
  // urgência dos 15 minutos de encerrar_campanhas_vencidas (aquela afeta
  // doador vendo campanha errada na hora; esta é limpeza de rascunho
  // abandonado, atrasar 1h não machuca ninguém).
  @Cron('0 * * * *')
  async executar(): Promise<void> {
    // try/catch: sem ele, uma exceção vinda da função SQL vira `unhandledRejection` (o @Cron chama este método
    // sem `await` de ninguém), e o Node moderno derruba o processo inteiro por causa de um job de limpeza.
    // Mesmo tratamento nos 3 crons do sistema, ver CampanhaServiceEncerrarVencidas e
    // PerfilPesquisadorServiceReativarVencidos.
    try {
      const resultado = await this.pool.query<{
        expirar_campanhas_rascunho: number;
      }>('SELECT public.expirar_campanhas_rascunho()');
      const quantidade = resultado.rows[0]?.expirar_campanhas_rascunho ?? 0;

      if (quantidade > 0) {
        this.logger.log(
          `${quantidade} campanha(s) rascunho abandonada(s) expirada(s) automaticamente.`,
        );
      }
    } catch (erro) {
      this.logger.error(
        `Falha ao expirar campanhas em rascunho: ${erro instanceof Error ? erro.message : String(erro)}`,
      );
    }
  }
}
