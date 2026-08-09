// `null` (não 0) nos campos de módulo ainda não construído (campanha,
// notificacao) — o card do React precisa distinguir "existe e é zero" de
// "esse módulo nem existe ainda" (mostra "—" em vez de "0").
export interface DashboardResumoResponseDto {
  totalUsuarios: number;
  totalPesquisadores: number;
  totalPapeis: number;
  totalPermissoes: number;
  totalConfiguracoes: number;
  totalCampanhas: null;
  sessoesAtivas: number;
  notificacoesPendentes: null;
}
