// Interruptores das tarefas automáticas: espelha nest/src/commons/agendamento/tarefa-automatica.ts (as 5 do sistema) e o
// pagamento automático do Campo de Testes (nest/src/30-campo-testes, CHAVE_PAGAMENTO_AUTOMATICO). Cada um é um parâmetro
// booleano em configuracoes. `tarefa` é o nome que a T5 manda para "Rodar agora" (POST /campo-testes/pagamento/tarefas/:tarefa).
export interface TarefaAutomatica {
  chave: string;
  tarefa: 'encerrar' | 'repasse' | 'devolucao' | 'conferir' | 'email' | 'pagar';
  rotulo: string;
  icone: string;
  dica: string;
}

// As 4 do pagamento (T5): ligadas por padrão; desligar pausa a execução agendada. O aviso do Dashboard olha só estas.
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
    dica: 'Pede ao provedor a transferência dos repasses na fila que já passaram da carência (repasse_carencia_dias; 0 para testar na hora).',
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

// O envio de e-mail: card da T6 (Caixa de E-mails), junto da caixa. Ligado no banco de produção; desligado no banco de
// demonstração (07, [07-DEMONSTRACAO]), para o e-mail esperar na fila até alguém conferir e rodar, sem sair sozinho
// nem gastar a cota do provedor durante os testes.
export const ENVIO_EMAIL_AUTOMATICO: TarefaAutomatica = {
  chave: 'tarefa_envio_email_ligada',
  tarefa: 'email',
  rotulo: 'Enviar os e-mails',
  icone: 'fa-envelope',
  dica: 'Envia os e-mails da fila. Ligado, envia sozinho a cada minuto; desligado, eles esperam na fila até o Rodar agora.',
};

// Só do Campo de Testes: desligado por padrão; só age no modo rápido (provedor de teste).
export const PAGAMENTO_AUTOMATICO: TarefaAutomatica = {
  chave: 'teste_pagamento_automatico_ligado',
  tarefa: 'pagar',
  rotulo: 'Pagar o que está em aberto',
  icone: 'fa-money-bill-wave',
  dica: 'Faz o papel de quem apoia: paga as contribuições pendentes. Ligado, paga sozinho a cada minuto.',
};
