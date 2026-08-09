// Tradução code -> rótulo amigável (09-08-2026, pedido do Lucas: "parece
// linha de código, pq é linha de código" — os 32 valores de
// `permissao.nome` são o identificador estável usado por tem_permissao()
// no banco (03_funcoes_seguranca.sql), nunca deveriam ser renomeados lá;
// aqui é só a CAMADA DE EXIBIÇÃO. Puramente uma tabela de tradução — sem
// coluna nova no banco, sem endpoint novo: quem tem `nome`, tem o rótulo.
// Mesma ordem por domínio de 07_seed_dados.sql [07-B-2]/[07-C-2]
// (A,B,C,D,E,F,H,I,L), só pra facilitar achar um item aqui.
//
// Virou objeto (09-08-2026, Bloco F do prompt do Claude Web: coluna
// "Descrição" na tabela Permissões + modal de detalhe por linha) — cada
// entrada carrega, além do nome amigável, um resumo curto (pra coluna),
// um texto mais longo dividido em "o que faz"/"por que existe" (pro
// modal) e uma classificação de impacto (badge do modal). Propositalmente
// NÃO carrega "quem usa hoje" aqui — isso é lido AO VIVO da matriz Papel ×
// Permissão (papelPermissaoApi), não hardcoded neste dicionário, senão
// desatualizaria sozinho toda vez que alguém conceder/revogar pela tela.
//
// Se uma permissão nova nascer sem entrada aqui, todo helper abaixo cai
// pro próprio `nome` cru (ou um objeto mínimo equivalente) — nunca quebra,
// só fica menos bonito até alguém lembrar de adicionar a tradução.
export const DETALHE_PERMISSAO = {
  // A — Visão Geral & Configuração Inicial
  relatorio_visualizar: {
    nome: 'Visualizar Relatórios',
    resumo: 'Acesso a relatórios agregados do sistema.',
    oQueFaz:
      'Libera acesso a relatórios com números consolidados (contagens, totais) — nunca o dado individual de uma pessoa só.',
    porQueExiste:
      'Dá visibilidade gerencial sem exigir acesso a cada registro individual — o relatório já vem agregado.',
    impacto: 'baixo',
  },
  // B — RBAC
  papel_atribuir: {
    nome: 'Atribuir Papel',
    resumo: 'Dar um papel (ex.: moderador) a um usuário já cadastrado.',
    oQueFaz: 'Permite atribuir um papel existente a um usuário já cadastrado no sistema.',
    porQueExiste:
      'É o mecanismo de promover alguém a uma função de confiança — precisa ser restrito, senão qualquer pessoa poderia se autopromover.',
    impacto: 'alto',
  },
  papel_gerenciar: {
    nome: 'Gerenciar Papéis',
    resumo: 'Renomear papéis e conceder/revogar permissões na matriz.',
    oQueFaz:
      'Permite renomear papéis existentes e conceder/revogar permissões de um papel na matriz Papel × Permissão.',
    porQueExiste:
      'É o controle central do RBAC — quem tem essa permissão decide o que cada papel PODE fazer no sistema inteiro.',
    impacto: 'alto',
  },
  // C — CONFIG
  configuracao_gerenciar: {
    nome: 'Gerenciar Configurações',
    resumo: 'Criar/editar/excluir os valores globais de regra de negócio.',
    oQueFaz:
      'Permite criar, editar e excluir os valores globais que controlam regras de negócio (prazos, limites, taxas).',
    porQueExiste:
      'Essas configurações afetam o sistema inteiro de uma vez — mudar uma tem efeito imediato pra todo mundo.',
    impacto: 'alto',
  },
  tipolink_gerenciar: {
    nome: 'Gerenciar Tipos de Link',
    resumo: 'Cadastrar/editar os tipos de link acadêmico aceitos.',
    oQueFaz:
      'Permite cadastrar/editar os tipos de link acadêmico aceitos no perfil (ex.: Lattes, ORCID, LinkedIn).',
    porQueExiste:
      'Catálogo de apoio — cresce conforme surgem novas redes/plataformas acadêmicas relevantes.',
    impacto: 'baixo',
  },
  area_conhecimento_gerenciar: {
    nome: 'Gerenciar Áreas de Conhecimento',
    resumo: 'Cadastrar/editar as áreas de conhecimento do catálogo.',
    oQueFaz:
      'Permite cadastrar/editar as áreas de conhecimento (ex.: Biologia, Engenharia) usadas pra classificar pesquisadores e campanhas.',
    porQueExiste:
      'Catálogo de apoio à busca e organização — sem ele, não dá pra filtrar campanhas por área.',
    impacto: 'baixo',
  },
  motivo_denuncia_gerenciar: {
    nome: 'Gerenciar Motivos de Denúncia',
    resumo: 'Cadastrar/editar os motivos disponíveis ao denunciar.',
    oQueFaz:
      'Permite cadastrar/editar os motivos disponíveis ao denunciar uma campanha ou perfil.',
    porQueExiste:
      'Padroniza denúncias em categorias conhecidas, em vez de texto livre — facilita a triagem de quem modera.',
    impacto: 'baixo',
  },
  arquivo_gerenciar: {
    nome: 'Gerenciar Arquivos',
    resumo: 'Editar/remover metadados de arquivos enviados ao sistema.',
    oQueFaz:
      'Permite editar/remover metadados de arquivos (imagens, PDFs) vinculados a campanhas/atualizações.',
    porQueExiste:
      'Alguém precisa poder corrigir ou remover um arquivo problemático sem depender de quem fez o upload original.',
    impacto: 'médio',
  },
  // D — USUÁRIO
  usuario_suspender: {
    nome: 'Suspender Usuário',
    resumo: 'Bloquear temporariamente o acesso de uma conta.',
    oQueFaz: 'Permite bloquear temporariamente o acesso de uma conta, impedindo login por um período.',
    porQueExiste:
      'É a ferramenta principal de moderação sobre contas problemáticas, sem precisar excluir a conta.',
    impacto: 'alto',
  },
  usuario_visualizar_sensivel: {
    nome: 'Ver Dados Sensíveis do Usuário',
    resumo: 'Ver dados normalmente ocultos de uma conta (ex.: IP).',
    oQueFaz: 'Libera a visualização de dados normalmente ocultos de um usuário (ex.: histórico de login, IP).',
    porQueExiste:
      'Investigação de fraude/abuso às vezes exige ver dado que ninguém mais enxerga de outra conta — fica restrito e auditável.',
    impacto: 'alto',
  },
  perfil_pesquisador_visualizar_sensivel: {
    nome: 'Ver Dados Sensíveis do Pesquisador',
    resumo: 'Ver dados sensíveis do perfil acadêmico de um pesquisador.',
    oQueFaz: 'Mesma ideia da permissão anterior, mas para dados sensíveis do perfil acadêmico de um pesquisador.',
    porQueExiste:
      'O perfil de pesquisador tem campos que não deveriam ser públicos por padrão — só quem investiga precisa ver.',
    impacto: 'alto',
  },
  termos_uso_gerenciar: {
    nome: 'Gerenciar Termos de Uso',
    resumo: 'Publicar uma nova versão dos Termos de Uso.',
    oQueFaz: 'Permite publicar uma nova versão dos Termos de Uso do sistema.',
    porQueExiste:
      'Termos de uso têm peso jurídico — só quem tem essa permissão pode "trocar o contrato" que todo mundo aceita.',
    impacto: 'alto',
  },
  sessao_revogar: {
    nome: 'Revogar Sessão',
    resumo: 'Encerrar à força uma sessão de login ativa de outra pessoa.',
    oQueFaz: 'Permite encerrar à força uma sessão de login ativa de outro usuário.',
    porQueExiste:
      'Em caso de conta comprometida (senha vazada, dispositivo roubado), alguém precisa poder desconectar a sessão de outra pessoa na hora.',
    impacto: 'médio',
  },
  recuperacao_senha_revogar: {
    nome: 'Revogar Recuperação de Senha',
    resumo: 'Invalidar um pedido de "esqueci minha senha" em andamento.',
    oQueFaz: 'Permite invalidar um pedido de recuperação de senha em andamento.',
    porQueExiste:
      'Se um pedido de recuperação for suspeito (não foi a própria pessoa que pediu), dá pra cancelar antes que alguém troque a senha de outra conta.',
    impacto: 'médio',
  },
  verificacao_email_reenviar: {
    nome: 'Reenviar Verificação de E-mail',
    resumo: 'Disparar de novo o e-mail de confirmação de conta.',
    oQueFaz: 'Permite disparar de novo o e-mail de confirmação de conta pra um usuário que ainda não verificou.',
    porQueExiste: 'Ação de suporte comum — e-mail que não chegou, foi pro spam, ou o link expirou.',
    impacto: 'baixo',
  },
  notificacao_processar: {
    nome: 'Processar Notificações',
    resumo: 'Marcar notificações do sistema como processadas/enviadas.',
    oQueFaz: 'Permite marcar notificações do sistema como processadas/enviadas.',
    porQueExiste: 'Suporte técnico da fila de notificações — garantir que nada fique parado sem ser entregue.',
    impacto: 'baixo',
  },
  usuario_excluir: {
    nome: 'Excluir Usuário',
    resumo: 'Excluir (logicamente) a conta de outra pessoa.',
    oQueFaz: 'Permite excluir, de forma lógica (reversível só via banco), a conta de outra pessoa.',
    porQueExiste:
      'Normalmente é autoatendimento — cada um exclui a própria conta; esta permissão existe só pra quando é preciso agir sobre a conta de outra pessoa.',
    impacto: 'alto',
  },
  usuario_desbloquear: {
    nome: 'Desbloquear Usuário',
    resumo: 'Zerar o bloqueio de login por tentativas erradas.',
    oQueFaz: 'Permite zerar o bloqueio de login causado por excesso de tentativas erradas de senha.',
    porQueExiste:
      'Ação de suporte recorrente — a pessoa errou demais a senha e precisa de alguém pra liberar o acesso de novo.',
    impacto: 'médio',
  },
  // E — CAMPANHA
  campanha_aprovar: {
    nome: 'Aprovar Campanha',
    resumo: 'Publicar oficialmente uma campanha submetida.',
    oQueFaz: 'Permite publicar oficialmente uma campanha de financiamento submetida por um pesquisador.',
    porQueExiste: 'É o portão de qualidade antes de uma campanha aparecer pro público arrecadar dinheiro de verdade.',
    impacto: 'alto',
  },
  campanha_rejeitar: {
    nome: 'Rejeitar Campanha',
    resumo: 'Recusar uma campanha submetida, com justificativa.',
    oQueFaz: 'Permite recusar uma campanha submetida, sempre com uma justificativa.',
    porQueExiste: 'Contraparte da aprovação — nem toda submissão deve virar campanha pública.',
    impacto: 'alto',
  },
  campanha_editar: {
    nome: 'Editar Campanha',
    resumo: 'Alterar o conteúdo de uma campanha sem ser o autor.',
    oQueFaz: 'Permite alterar o conteúdo de uma campanha depois de criada, mesmo não sendo o autor dela.',
    porQueExiste: 'Às vezes uma correção precisa ser feita rápido (erro de digitação, dado incorreto) sem esperar o autor.',
    impacto: 'médio',
  },
  denuncia_responder: {
    nome: 'Responder Denúncia',
    resumo: 'Dar um veredito oficial a uma denúncia registrada.',
    oQueFaz: 'Permite dar um veredito/resposta oficial a uma denúncia registrada por outro usuário.',
    porQueExiste:
      'Toda denúncia precisa de um desfecho visível — sem isso, viraria fila sem fim, sem retorno pra quem denunciou.',
    impacto: 'médio',
  },
  solicitacao_encerramento_decidir: {
    nome: 'Decidir Encerramento Antecipado',
    resumo: 'Aprovar/recusar pedido de encerrar campanha antes do prazo.',
    oQueFaz:
      'Permite aprovar ou recusar o pedido de um pesquisador pra encerrar a própria campanha antes do prazo original.',
    porQueExiste: 'Encerrar antes do prazo mexe com a expectativa de quem já contribuiu — não pode ser decisão unilateral do autor.',
    impacto: 'alto',
  },
  comentario_moderar: {
    nome: 'Moderar Comentário',
    resumo: 'Ocultar/remover comentários publicados numa campanha.',
    oQueFaz: 'Permite ocultar/remover comentários publicados numa campanha.',
    porQueExiste:
      'Moderação de conteúdo básica — comentário ofensivo, spam ou fora de contexto precisa de alguém que possa agir.',
    impacto: 'médio',
  },
  atualizacao_moderar: {
    nome: 'Moderar Atualização',
    resumo: 'Ocultar/remover atualizações publicadas por um pesquisador.',
    oQueFaz: 'Permite ocultar/remover atualizações que um pesquisador publica sobre o andamento da campanha.',
    porQueExiste: 'Mesma lógica de moderar comentário, mas pro conteúdo que o próprio autor da campanha publica.',
    impacto: 'médio',
  },
  repasse_aprovar: {
    nome: 'Aprovar Repasse',
    resumo: 'Liberar a transferência do dinheiro arrecadado.',
    oQueFaz: 'Permite liberar a transferência de dinheiro arrecadado pra conta do pesquisador.',
    porQueExiste: 'É o ponto onde dinheiro de verdade sai do sistema — exige aprovação explícita, nunca automático.',
    impacto: 'alto',
  },
  // F — LINK
  link_academico_gerenciar: {
    nome: 'Gerenciar Links Acadêmicos',
    resumo: 'Editar/remover links acadêmicos de outra pessoa.',
    oQueFaz: 'Permite editar/remover links acadêmicos vinculados ao perfil de outro usuário (Lattes, ORCID etc.).',
    porQueExiste: 'Suporte a casos em que um link está quebrado, desatualizado ou mal cadastrado pelo próprio dono.',
    impacto: 'baixo',
  },
  // H — CONTRIBUIÇÃO
  contribuicao_visualizar_sensivel: {
    nome: 'Ver Dados Sensíveis da Contribuição',
    resumo: 'Ver dados financeiros detalhados de uma contribuição.',
    oQueFaz: 'Libera a visualização de dados financeiros detalhados de uma contribuição individual.',
    porQueExiste: 'Dado financeiro de terceiro é sensível por padrão — só quem precisa investigar/auditar deveria ver o detalhe.',
    impacto: 'alto',
  },
  auditoria_financeira_visualizar: {
    nome: 'Ver Auditoria Financeira',
    resumo: 'Ver o histórico completo de eventos financeiros.',
    oQueFaz:
      'Libera acesso ao histórico completo de eventos financeiros do sistema (repasses, estornos, mudanças de status).',
    porQueExiste: 'É a trilha de auditoria do dinheiro que passa pela plataforma — só quem responde por isso deveria enxergar tudo.',
    impacto: 'alto',
  },
  // I — SCORE
  score_editar: {
    nome: 'Editar Score',
    resumo: 'Ajustar parâmetros do motor de cálculo de reputação.',
    oQueFaz: 'Permite ajustar manualmente parâmetros e rótulos do motor de cálculo de reputação (score) de pesquisadores.',
    porQueExiste:
      'O score é calculado automaticamente, mas os PARÂMETROS do cálculo (pesos, faixas) precisam de alguém que possa recalibrar o motor.',
    impacto: 'médio',
  },
  score_visualizar: {
    nome: 'Ver Score de Terceiros',
    resumo: 'Ver o score de reputação de qualquer pesquisador.',
    oQueFaz: 'Permite ver o score de reputação de um pesquisador mesmo fora das regras padrão de visibilidade.',
    porQueExiste:
      'Hoje o score já é público pra qualquer sessão (decisão de produto, ver DOCUMENTACAO_BD.md) — esta permissão fica como reforço, caso a visibilidade pública seja revista no futuro.',
    impacto: 'baixo',
  },
  // L — LOG
  log_visualizar: {
    nome: 'Ver Log de Auditoria',
    resumo: 'Ver o histórico de alterações de qualquer tabela.',
    oQueFaz: 'Permite ver o histórico de alterações (log de auditoria) de qualquer tabela do sistema — quem mudou o quê e quando.',
    porQueExiste: 'É a trilha de auditoria geral do sistema inteiro — acesso amplo, por isso reservado a quem realmente precisa investigar.',
    impacto: 'alto',
  },
};

export function nomeAmigavelPermissao(nome) {
  return DETALHE_PERMISSAO[nome]?.nome ?? nome;
}

// Sempre devolve um objeto usável (nunca null) — permissão sem entrada no
// dicionário cai pro nome cru em todo campo, mesma filosofia de
// nomeAmigavelPermissao: nunca quebra a tela, só fica menos rico até
// alguém lembrar de documentar.
export function detalhePermissao(nome) {
  return (
    DETALHE_PERMISSAO[nome] ?? {
      nome,
      resumo: '',
      oQueFaz: 'Ainda não documentada.',
      porQueExiste: 'Ainda não documentada.',
      impacto: null,
    }
  );
}
