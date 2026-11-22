import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Pool } from 'pg';
import { PG_POOL } from '../../commons/database/database.constants';
import { ARMAZENAMENTO_SERVICE } from '../../commons/storage/storage.constants';
import type { ArmazenamentoService } from '../../commons/storage/storage.service.interface';

// Prazo de carência da exclusão de conta (22-11-2026). Excluir a conta só agenda a exclusão
// (excluir_conta_usuario, 03); 1x por dia, esta tarefa finaliza as contas que passaram do prazo
// (configuracoes.conta_exclusao_carencia_dias, 30 dias): a função SQL apaga os rascunhos, desativa a foto e
// anonimiza nome, e-mail e CPF, e devolve as chaves das fotos, que só o Nest consegue apagar do armazenamento.
//
// Mesmo padrão dos outros jobs (CampanhaServiceExpireDrafts): `PG_POOL` direto, porque o @Cron roda fora do
// pipeline HTTP, e função SECURITY DEFINER.
@Injectable()
export class UsuarioServiceFinalizarExclusoes {
  private readonly logger = new Logger(UsuarioServiceFinalizarExclusoes.name);

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    @Inject(ARMAZENAMENTO_SERVICE)
    private readonly armazenamento: ArmazenamentoService,
  ) {}

  // Às 3h10: o prazo é contado em dias, não precisa de pressa, e o horário fica longe dos outros jobs de hora cheia.
  @Cron('10 3 * * *')
  async executar(): Promise<void> {
    // try/catch: sem ele, um erro vira `unhandledRejection` e derruba o processo (mesmo tratamento dos outros crons).
    try {
      const resultado = await this.pool.query<{ chave: string }>(
        'SELECT public.finalizar_exclusoes_vencidas() AS chave',
      );

      // Melhor esforço: a conta já foi anonimizada; se o armazenamento falhar, o arquivo fica órfão no bucket
      // (mesma categoria de risco baixo já aceita no módulo de arquivos).
      for (const { chave } of resultado.rows) {
        await this.armazenamento.excluirObjeto(chave).catch(() => undefined);
      }

      if (resultado.rows.length > 0) {
        this.logger.log(
          `${resultado.rows.length} foto(s) de contas com exclusão definitiva apagada(s) do armazenamento.`,
        );
      }
    } catch (erro) {
      this.logger.error(
        `Falha ao finalizar as exclusões de conta vencidas: ${erro instanceof Error ? erro.message : String(erro)}`,
      );
    }
  }
}
