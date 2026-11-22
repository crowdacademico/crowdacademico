import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Pool } from 'pg';
import { PG_POOL } from '../../commons/database/database.constants';

// Apaga log_auditoria mais velho que `configuracoes.log_auditoria_retencao_dias`
// (365 dias; 0 = guardar para sempre). Sem este job a tabela só cresce. A regra
// inteira mora na função SQL `limpar_log_auditoria()` (SECURITY DEFINER, 05 [05-L]),
// que também deixa uma linha de rastro quando apaga algo; aqui só agenda e loga.
//
// No mesmo horário, apaga o IP do aceite de contribuição mais velho que
// `configuracoes.ip_aceite_contribuicao_retencao_dias` (5 anos, o prazo que o Termo
// de Uso promete no item 5.4), pela função `limpar_ip_aceite_contribuicao()`.
//
// E apaga as notificações já resolvidas (enviado, falhou, cancelado) mais velhas que
// `configuracoes.notificacao_retencao_dias` (180 dias; 0 = guardar para sempre), pela
// função `limpar_notificacoes_antigas()` (18-11-2026). Pendente nunca é apagada.
//
// E apaga as sessões (login e renovação) encerradas há mais de `configuracoes.sessao_retencao_dias` (180 dias, os 6
// meses do Marco Civil; 0 = guardar para sempre), pela função `limpar_sessoes_antigas()` (21-11-2026).
//
// Mesmo molde dos jobs de campanha (`PG_POOL` direto, porque o job roda fora do
// pipeline HTTP e sem sessão de usuário).
@Injectable()
export class LogAuditoriaServiceClean {
  private readonly logger = new Logger(LogAuditoriaServiceClean.name);

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

      const ips = await this.pool.query<{
        limpar_ip_aceite_contribuicao: number;
      }>('SELECT public.limpar_ip_aceite_contribuicao()');
      const quantidadeIps = ips.rows[0]?.limpar_ip_aceite_contribuicao ?? 0;
      if (quantidadeIps > 0) {
        this.logger.log(
          `${quantidadeIps} IP(s) de aceite de contribuição apagado(s) por passar do prazo de retenção.`,
        );
      }

      const notificacoes = await this.pool.query<{
        limpar_notificacoes_antigas: number;
      }>('SELECT public.limpar_notificacoes_antigas()');
      const quantidadeNotificacoes =
        notificacoes.rows[0]?.limpar_notificacoes_antigas ?? 0;
      if (quantidadeNotificacoes > 0) {
        this.logger.log(
          `${quantidadeNotificacoes} notificação(ões) já resolvida(s) apagada(s) por passar do prazo de guarda.`,
        );
      }

      const sessoes = await this.pool.query<{
        limpar_sessoes_antigas: number;
      }>('SELECT public.limpar_sessoes_antigas()');
      const quantidadeSessoes = sessoes.rows[0]?.limpar_sessoes_antigas ?? 0;
      if (quantidadeSessoes > 0) {
        this.logger.log(
          `${quantidadeSessoes} sessão(ões) encerrada(s) apagada(s) por passar do prazo de guarda.`,
        );
      }
    } catch (erro) {
      this.logger.error(
        `Falha na limpeza por prazo de retenção (log de auditoria, IP de aceite, notificações ou sessões): ${erro instanceof Error ? erro.message : String(erro)}`,
      );
    }
  }
}
