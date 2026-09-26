// `null` (não 0) só no que AINDA não tem módulo construído: o card do React precisa distinguir "existe e é
// zero" de "esse módulo nem existe ainda" (mostra "-" em vez de "0"). `notificacoesPendentes` é `null` porque
// 26-notificacao ainda não foi construído.
//
// Campanhas por status, valor total arrecadado e denúncias pendentes (RF-084) são `number` de verdade (não
// `null`): `campanha`/`denuncia` já são tabela real, não dependem de nenhum módulo Nest vazio para existir.
//
// campanhasParaRevisaoScore, a 5ª parte do RF-084 (campanhas na fila de aprovação cujo pesquisador está abaixo
// de score_minimo_campanha), é só um SINAL para o admin revisar com mais cuidado, nunca bloqueia nada (ver
// fn_precisa_revisao_score, 05 [05-I-1]).
export interface DashboardResponseSummary {
  totalUsuarios: number;
  totalPesquisadores: number;
  totalPapeis: number;
  totalPermissoes: number;
  totalConfiguracoes: number;
  totalCampanhas: number;
  sessoesAtivas: number;
  notificacoesPendentes: null;
  campanhasAtivas: number;
  campanhasSucesso: number;
  campanhasNaoAtingida: number;
  campanhasAguardandoAprovacao: number;
  valorTotalArrecadado: number;
  denunciasPendentes: number;
  campanhasParaRevisaoScore: number;
}
