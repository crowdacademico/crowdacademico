// Tradução code -> rótulo amigável (09-08-2026, pedido do Lucas: "parece
// linha de código, pq é linha de código" — os 32 valores de
// `permissao.nome` são o identificador estável usado por tem_permissao()
// no banco (03_funcoes_seguranca.sql), nunca deveriam ser renomeados lá;
// aqui é só a CAMADA DE EXIBIÇÃO. Puramente uma tabela de tradução — sem
// coluna nova no banco, sem endpoint novo: quem tem `nome`, tem o rótulo.
// Mesma ordem por domínio de 07_seed_dados.sql [07-B-2]/[07-C-2]
// (A,B,C,D,E,F,H,I,L), só pra facilitar achar um item aqui.
//
// Se uma permissão nova nascer sem entrada aqui, `nomeAmigavelPermissao()`
// cai pro próprio `nome` cru — nunca quebra, só fica menos bonito até
// alguém lembrar de adicionar a tradução.
export const NOMES_AMIGAVEIS_PERMISSAO = {
  // A — Visão Geral & Configuração Inicial
  relatorio_visualizar: 'Visualizar Relatórios',
  // B — RBAC
  papel_atribuir: 'Atribuir Papel',
  papel_gerenciar: 'Gerenciar Papéis',
  // C — CONFIG
  configuracao_gerenciar: 'Gerenciar Configurações',
  tipolink_gerenciar: 'Gerenciar Tipos de Link',
  area_conhecimento_gerenciar: 'Gerenciar Áreas de Conhecimento',
  motivo_denuncia_gerenciar: 'Gerenciar Motivos de Denúncia',
  arquivo_gerenciar: 'Gerenciar Arquivos',
  // D — USUÁRIO
  usuario_suspender: 'Suspender Usuário',
  usuario_visualizar_sensivel: 'Ver Dados Sensíveis do Usuário',
  perfil_pesquisador_visualizar_sensivel: 'Ver Dados Sensíveis do Pesquisador',
  termos_uso_gerenciar: 'Gerenciar Termos de Uso',
  sessao_revogar: 'Revogar Sessão',
  recuperacao_senha_revogar: 'Revogar Recuperação de Senha',
  verificacao_email_reenviar: 'Reenviar Verificação de E-mail',
  notificacao_processar: 'Processar Notificações',
  usuario_excluir: 'Excluir Usuário',
  usuario_desbloquear: 'Desbloquear Usuário',
  // E — CAMPANHA
  campanha_aprovar: 'Aprovar Campanha',
  campanha_rejeitar: 'Rejeitar Campanha',
  campanha_editar: 'Editar Campanha',
  denuncia_responder: 'Responder Denúncia',
  solicitacao_encerramento_decidir: 'Decidir Encerramento Antecipado',
  comentario_moderar: 'Moderar Comentário',
  atualizacao_moderar: 'Moderar Atualização',
  repasse_aprovar: 'Aprovar Repasse',
  // F — LINK
  link_academico_gerenciar: 'Gerenciar Links Acadêmicos',
  // H — CONTRIBUIÇÃO
  contribuicao_visualizar_sensivel: 'Ver Dados Sensíveis da Contribuição',
  auditoria_financeira_visualizar: 'Ver Auditoria Financeira',
  // I — SCORE
  score_editar: 'Editar Score',
  score_visualizar: 'Ver Score de Terceiros',
  // L — LOG
  log_visualizar: 'Ver Log de Auditoria',
};

export function nomeAmigavelPermissao(nome) {
  return NOMES_AMIGAVEIS_PERMISSAO[nome] ?? nome;
}
