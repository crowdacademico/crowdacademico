// Agrupamento de configurações por assunto (09-08-2026, Bloco H do prompt
// do Claude Web: Dashboard como painel global) — mesmo espírito da tradução
// de permissões (permissao-nomes-amigaveis.js): puramente camada de
// exibição, sem coluna nova no banco. A tabela `configuracoes` crua (28
// linhas, todas juntas, sem contexto) virou uma lista organizada por tema —
// um admin não deveria precisar saber o que é "prazo_maximo_campanha_dias"
// pra entender que aquilo é sobre CAMPANHA.
//
// Se uma chave nova nascer sem entrada aqui, cai no grupo "Outras" — nunca
// quebra a tela, só fica sem organização até alguém lembrar de classificar.
export const GRUPO_CONFIGURACAO = {
  // Segurança
  limite_tentativas_login: 'Segurança',
  bloqueio_login_minutos: 'Segurança',
  suspensao_usuario_opcoes_dias: 'Segurança',
  // Financeiro
  taxa_plataforma_padrao: 'Financeiro',
  meta_minima_campanha: 'Financeiro',
  valor_minimo_contribuicao: 'Financeiro',
  // Campanha
  prazo_minimo_campanha_dias: 'Campanha',
  prazo_maximo_campanha_dias: 'Campanha',
  limite_campanhas_simultaneas: 'Campanha',
  limite_endossos_campanha: 'Campanha',
  limite_denuncias_24h: 'Campanha',
  janela_denuncias_horas: 'Campanha',
  limite_caracteres_descricao_campanha: 'Campanha',
  limite_caracteres_conteudo_atualizacao: 'Campanha',
  limite_caracteres_relato_denuncia: 'Campanha',
  limite_caracteres_justificativa_encerramento: 'Campanha',
  limite_caracteres_descricao_recompensa: 'Campanha',
  orcamento_min_itens: 'Campanha',
  orcamento_max_itens: 'Campanha',
  cronograma_min_marcos: 'Campanha',
  cronograma_max_marcos: 'Campanha',
  limite_caracteres_descricao_orcamento: 'Campanha',
  limite_caracteres_descricao_marco: 'Campanha',
  limite_links_academicos_perfil: 'Campanha',
  // Score / Reputação
  score_minimo_campanha: 'Score / Reputação',
  score_penalidade_abandono: 'Score / Reputação',
  score_penalidade_sem_justificativa: 'Score / Reputação',
  score_frequencia_esperada_mensal: 'Score / Reputação',
  // Geral
  email_suporte: 'Geral',
  notificar_novas_campanhas: 'Geral',
};

const ORDEM_GRUPOS = ['Segurança', 'Financeiro', 'Campanha', 'Score / Reputação', 'Geral', 'Outras'];

export function grupoConfiguracao(chave) {
  return GRUPO_CONFIGURACAO[chave] ?? 'Outras';
}

// Agrupa e já devolve na ORDEM certa pra exibir (nunca "Outras" primeiro,
// mesmo que ela tenha o maior número de linhas num banco com chaves novas
// ainda não classificadas).
export function agruparConfiguracoes(configuracoes) {
  const mapa = new Map();
  for (const config of configuracoes) {
    const grupo = grupoConfiguracao(config.chave);
    if (!mapa.has(grupo)) {
      mapa.set(grupo, []);
    }
    mapa.get(grupo).push(config);
  }
  return ORDEM_GRUPOS.filter((grupo) => mapa.has(grupo)).map((grupo) => ({
    grupo,
    itens: mapa.get(grupo),
  }));
}
