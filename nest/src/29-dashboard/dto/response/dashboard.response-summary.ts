// E-mails na fila e que falharam (27-notificacao): a RLS de notificacao conta só para quem pode ver os e-mails do
// sistema; para os outros papéis, 0.
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
  // Pessoas (contas distintas) com atividade recente, não sessões: o nome do campo ficou o de antes porque o React
  // já o lê. Ver contar_metricas_dashboard() (03, [03-M]).
  sessoesAtivas: number;
  notificacoesPendentes: number;
  notificacoesComFalha: number;
  campanhasAtivas: number;
  campanhasSucesso: number;
  campanhasNaoAtingida: number;
  campanhasAguardandoAprovacao: number;
  valorTotalArrecadado: number;
  denunciasPendentes: number;
  campanhasParaRevisaoScore: number;
}
