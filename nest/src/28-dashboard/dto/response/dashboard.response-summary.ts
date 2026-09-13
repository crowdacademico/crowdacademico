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
// nenhum módulo Nest vazio pra existir. NÃO incluído: "campanhas
// sinalizadas por baixa pontuação de reputação" (a 5ª parte do RF-084) -
// depende do motor de score estar fechado, ver PENDENCIAS e correcoes.md
// (RF-031); registrado lá, não implementado aqui de propósito.
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
}
