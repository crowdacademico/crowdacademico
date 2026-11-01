// Tipos de aviso que o sistema grava (notificacao.tipo_evento). Os gatilhos de [05-Q] (05_regras_negocio.sql)
// gravam os mesmos nomes; o texto de cada um mora em modelo_mensagem (07, [07-D-9]). Tipo novo: entra aqui, no
// gatilho, em CAMPOS_POR_TIPO e no seed de modelo_mensagem.
export const TIPO_NOTIFICACAO = {
  verificacaoEmail: 'verificacao_email',
  recuperacaoSenha: 'recuperacao_senha',
  campanhaAprovada: 'campanha_aprovada',
  campanhaRejeitada: 'campanha_rejeitada',
  novaCampanhaPesquisador: 'nova_campanha_pesquisador',
  novaAtualizacao: 'nova_atualizacao',
  campanhaSucesso: 'campanha_sucesso',
  campanhaNaoAtingida: 'campanha_nao_atingida',
  campanhaEncerradaModeracao: 'campanha_encerrada_moderacao',
  devolucaoConcluida: 'devolucao_concluida',
  repassePrevisto: 'repasse_previsto',
  encerramentoAprovado: 'encerramento_aprovado',
  encerramentoRejeitado: 'encerramento_rejeitado',
  pesquisadorSuspenso: 'pesquisador_suspenso',
  pesquisadorReativado: 'pesquisador_reativado',
  contestacaoAceita: 'contestacao_aceita',
  contestacaoRecusada: 'contestacao_recusada',
} as const;

export type TipoNotificacao =
  (typeof TIPO_NOTIFICACAO)[keyof typeof TIPO_NOTIFICACAO];

// Os campos de notificacao.dados que o texto de cada tipo pode usar ({{campo}}): o que o gatilho grava, mais o nome
// da pessoa. A tela mostra a lista ao editar, e a gravação recusa um campo que o tipo não tem.
export const CAMPOS_POR_TIPO: Record<TipoNotificacao, readonly string[]> = {
  verificacao_email: ['nome'],
  recuperacao_senha: ['nome', 'minutos'],
  campanha_aprovada: ['nome', 'titulo'],
  campanha_rejeitada: [
    'nome',
    'titulo',
    'justificativa',
    'reenvios_restantes',
    'prazo_reenvio_ate',
  ],
  nova_campanha_pesquisador: ['nome', 'titulo', 'nome_pesquisador'],
  nova_atualizacao: [
    'nome',
    'titulo',
    'nome_pesquisador',
    'titulo_atualizacao',
  ],
  campanha_sucesso: ['nome', 'titulo'],
  campanha_nao_atingida: ['nome', 'titulo'],
  campanha_encerrada_moderacao: ['nome', 'titulo'],
  devolucao_concluida: ['nome', 'titulo', 'valor'],
  repasse_previsto: [
    'nome',
    'titulo',
    'valor',
    'data_prevista',
    'tem_chave_verificada',
  ],
  encerramento_aprovado: ['nome', 'titulo', 'justificativa'],
  encerramento_rejeitado: ['nome', 'titulo', 'justificativa'],
  pesquisador_suspenso: ['nome', 'motivo', 'suspenso_ate'],
  pesquisador_reativado: ['nome'],
  contestacao_aceita: ['nome', 'justificativa'],
  contestacao_recusada: ['nome', 'justificativa'],
};

export const camposDoTipo = (tipo: string): readonly string[] =>
  (CAMPOS_POR_TIPO as Record<string, readonly string[] | undefined>)[tipo] ?? [
    'nome',
  ];

// Chave de dados que guarda o link com token, cifrado. Nunca sai pela API e é apagada quando o e-mail sai.
export const CHAVE_SEGREDO_NOTIFICACAO = 'segredo';

export const PERMISSAO_NOTIFICACAO = 'notificacao_processar';
export const MENSAGEM_SEM_PERMISSAO_NOTIFICACAO =
  'Sem permissão para ver os e-mails do sistema.';

export const TAMANHO_PAGINA_NOTIFICACAO = 20;

// Sino do painel: quantos avisos a lista traz (os mais novos).
export const LIMITE_AVISOS_SINO = 30;

export const PERMISSAO_MODELO_MENSAGEM = 'configuracao_gerenciar';
export const MENSAGEM_SEM_PERMISSAO_MODELO_MENSAGEM =
  'Sem permissão para editar as mensagens do sistema.';
