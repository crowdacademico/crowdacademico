import { Logger } from '@nestjs/common';
import { Pool } from 'pg';

// Interruptores das tarefas automáticas: um parâmetro booleano cada (configuracoes, 07), editável em Parâmetros do
// Sistema e nos cards da T5. Desligada, a execução AGENDADA pula a vez (pausa de operação: ex.: segurar o repasse
// durante um problema no provedor); "Rodar agora" da T5 chama a tarefa direto e roda mesmo desligada. Sem a linha do
// parâmetro, vale ligada (o padrão do sistema é tudo rodando).
export const TAREFA_AUTOMATICA = {
  encerrarCampanhas: 'tarefa_encerrar_campanhas_ligada',
  repasse: 'tarefa_repasse_ligada',
  devolucao: 'tarefa_devolucao_ligada',
  conferencia: 'tarefa_conferencia_ligada',
  envioEmail: 'tarefa_envio_email_ligada',
} as const;

// De quantos em quantos minutos cada tarefa roda. É daqui que sai o @Cron de cada uma (cronACada) e o "a cada N min"
// que a T5 mostra no card: mudar o intervalo é mudar um número aqui.
export const INTERVALO_TAREFA_MINUTOS: Record<
  keyof typeof TAREFA_AUTOMATICA,
  number
> = {
  encerrarCampanhas: 15,
  repasse: 5,
  devolucao: 5,
  conferencia: 10,
  envioEmail: 1,
};

// Expressão de agendamento "a cada N minutos" para o @Cron.
export function cronACada(minutos: number): string {
  return `*/${minutos} * * * *`;
}

export type ChaveTarefaAutomatica =
  (typeof TAREFA_AUTOMATICA)[keyof typeof TAREFA_AUTOMATICA];

// true = pode rodar. Banco fora do ar: não roda neste ciclo (a própria tarefa falharia igual) e avisa no log.
export async function tarefaLigada(
  pool: Pool,
  chave: ChaveTarefaAutomatica,
  logger: Logger,
): Promise<boolean> {
  try {
    const resultado = await pool.query<{ ligada: boolean }>(
      'SELECT public.config_booleano($1::text, TRUE) AS ligada',
      [chave],
    );
    return resultado.rows[0]?.ligada !== false;
  } catch (erro) {
    logger.warn(
      `Não foi possível ler o interruptor ${chave}; a tarefa pula este ciclo: ${erro instanceof Error ? erro.message : String(erro)}`,
    );
    return false;
  }
}
