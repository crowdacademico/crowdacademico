// Interruptores das tarefas automáticas: espelha nest/src/commons/agendamento/tarefa-automatica.ts (as 4 do sistema) e o
// pagamento automático do Campo de Testes (nest/src/campo-testes, CHAVE_PAGAMENTO_AUTOMATICO). Cada um é um parâmetro
// booleano em configuracoes. `tarefa` é o nome que a T5 manda para "Rodar agora" (POST /campo-testes/pagamento/tarefas/:tarefa).
export interface TarefaAutomatica {
  chave: string;
  tarefa: 'encerrar' | 'repasse' | 'devolucao' | 'conferir' | 'pagar';
  rotulo: string;
  icone: string;
  dica: string;
}

// As 4 do sistema: ligadas por padrão; desligar pausa a execução agendada.
export const TAREFAS_AUTOMATICAS: TarefaAutomatica[] = [
  {
    chave: 'tarefa_encerrar_campanhas_ligada',
    tarefa: 'encerrar',
    rotulo: 'Fechar campanhas vencidas',
    icone: 'fa-flag-checkered',
    dica: 'Vence os Pix pendentes que passaram do prazo e encerra as campanhas cujo prazo acabou.',
  },
  {
    chave: 'tarefa_repasse_ligada',
    tarefa: 'repasse',
    rotulo: 'Rodar o repasse',
    icone: 'fa-paper-plane',
    dica: 'Pede ao provedor a transferência dos repasses na fila.',
  },
  {
    chave: 'tarefa_devolucao_ligada',
    tarefa: 'devolucao',
    rotulo: 'Rodar a devolução',
    icone: 'fa-rotate-left',
    dica: 'Devolve as contribuições a devolver (tudo-ou-nada sem meta, projeto cancelado, moderação).',
  },
  {
    chave: 'tarefa_conferencia_ligada',
    tarefa: 'conferir',
    rotulo: 'Conferir com o provedor',
    icone: 'fa-magnifying-glass-dollar',
    dica: 'Reconsulta os pagamentos sem aviso, cancela cobranças mortas e tenta de novo os avisos parados.',
  },
];

// Só do Campo de Testes: desligado por padrão; só age no modo rápido (provedor de teste).
export const PAGAMENTO_AUTOMATICO: TarefaAutomatica = {
  chave: 'teste_pagamento_automatico_ligado',
  tarefa: 'pagar',
  rotulo: 'Pagar o que está em aberto',
  icone: 'fa-money-bill-wave',
  dica: 'Faz o papel de quem apoia: paga as contribuições pendentes. Ligado, paga sozinho a cada minuto.',
};
