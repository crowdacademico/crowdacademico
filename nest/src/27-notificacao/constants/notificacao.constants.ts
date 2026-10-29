// Tipos de evento de notificação (notificacao.tipo_evento). Os gatilhos de [05-Q]
// (05_regras_negocio.sql) gravam os mesmos nomes. O texto de cada um NÃO fica no código: mora em modelo_mensagem (banco),
// que o admin edita criando versões. Tipo novo: entra aqui, no gatilho, em modelo_mensagem e em regra_notificacao.
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

// Chave de dados que guarda o link com token, cifrado. Nunca sai pela API e é apagada quando o e-mail sai.
export const CHAVE_SEGREDO_NOTIFICACAO = 'segredo';

export const PERMISSAO_NOTIFICACAO = 'notificacao_processar';
export const MENSAGEM_SEM_PERMISSAO_NOTIFICACAO =
  'Sem permissão para ver os e-mails do sistema.';

export const TAMANHO_PAGINA_NOTIFICACAO = 20;
