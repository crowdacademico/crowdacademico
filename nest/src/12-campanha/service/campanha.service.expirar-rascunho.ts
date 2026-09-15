import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Pool } from 'pg';
import { PG_POOL } from '../../commons/database/database.constants';

// Fecha o gap achado numa conversa com o Lucas (15-09-2026): uma campanha
// nasce em 'aguardando_aprovacao' assim que "Criar" é clicado, antes de ter
// orçamento/cronograma completos (RF-040/042 só exigem o mínimo NA
// APROVAÇÃO, pensado pra deixar cadastrar "aos poucos"). Se a pessoa nunca
// voltar pra terminar (queda de energia, fechou a aba sem querer), a
// campanha fica presa nesse status pra sempre - nunca pode ser aprovada
// (trava no mesmo mínimo), ocupa 1 das 2 vagas simultâneas do RF-048 e
// suja a fila de aprovação do Administrador indefinidamente.
//
// Mesmo padrão de CampanhaServiceEncerrarVencidas (mesma pasta) - `PG_POOL`
// direto (job agendado roda fora do pipeline HTTP, sem GlobalDbInterceptor
// pra abrir transação/CLS), função SECURITY DEFINER (bypassa RLS de
// propósito, não precisa de app.id_usuario_atual setado).
@Injectable()
export class CampanhaServiceExpirarRascunho {
  private readonly logger = new Logger(CampanhaServiceExpirarRascunho.name);

  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  // 1x por hora - o prazo de graça é medido em horas (48h padrão,
  // `configuracoes.campanha_rascunho_ttl_horas`), não precisa da mesma
  // urgência dos 15 minutos de encerrar_campanhas_vencidas (aquela afeta
  // doador vendo campanha errada na hora; esta é limpeza de rascunho
  // abandonado, atrasar 1h não machuca ninguém).
  @Cron('0 * * * *')
  async executar(): Promise<void> {
    const resultado = await this.pool.query<{
      expirar_campanhas_rascunho: number;
    }>('SELECT public.expirar_campanhas_rascunho()');
    const quantidade = resultado.rows[0]?.expirar_campanhas_rascunho ?? 0;

    if (quantidade > 0) {
      this.logger.log(
        `${quantidade} campanha(s) rascunho abandonada(s) expirada(s) automaticamente.`,
      );
    }
  }
}
