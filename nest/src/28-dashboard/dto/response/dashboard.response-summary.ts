// `null` (não 0) só no que AINDA não tem módulo construído - o card do
// React precisa distinguir "existe e é zero" de "esse módulo nem existe
// ainda" (mostra "-" em vez de "0"). `totalCampanhas` saiu daqui
// (23-08-2026): 12-campanha existe desde 22-08-2026, virou `number` de
// verdade. `notificacoesPendentes` continua `null` - 26-notificacao
// ainda não foi construído.
//
// ADICIONADOS (12-09-2026, achado de agente numa auditoria RF x
// implementação - RF-084 pedia isso e não existia): campanhas por status,
// valor total arrecadado, denúncias pendentes. Todos `number` de verdade
// (não `null`) - `campanha`/`denuncia` já são tabela real, não dependem de
// nenhum módulo Nest vazio pra existir.
//
// ADICIONADO (24-09-2026): campanhasParaRevisaoScore, a 5ª parte do RF-084 (campanhas na fila de
// aprovação cujo pesquisador está abaixo de score_minimo_campanha). É só um SINAL para o admin
// revisar com mais cuidado, nunca bloqueia nada (ver fn_precisa_revisao_score, 05 [05-I-1]).
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
