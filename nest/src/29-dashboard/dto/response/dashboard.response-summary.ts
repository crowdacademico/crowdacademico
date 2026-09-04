// `null` (não 0) só no que AINDA não tem módulo construído - o card do
// React precisa distinguir "existe e é zero" de "esse módulo nem existe
// ainda" (mostra "-" em vez de "0"). `totalCampanhas` saiu daqui
// (23-08-2026): 12-campanha existe desde 22-08-2026, virou `number` de
// verdade. `notificacoesPendentes` continua `null` - 26-notificacao
// ainda não foi construído.
export interface DashboardResponseSummary {
  totalUsuarios: number;
  totalPesquisadores: number;
  totalPapeis: number;
  totalPermissoes: number;
  totalConfiguracoes: number;
  totalCampanhas: number;
  sessoesAtivas: number;
  notificacoesPendentes: null;
}
