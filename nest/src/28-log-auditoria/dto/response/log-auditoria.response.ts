export class LogAuditoriaResponseDto {
  idLog: number;
  tabela: string;
  identidadeRegistro: string;
  operacao: string;
  idUsuarioResponsavel: number | null;
  // Join com usuario (LEFT — precisa continuar aparecendo mesmo se o
  // responsável for NULL, ou se a conta dele já tiver sido excluída).
  nomeResponsavel: string | null;
  camposAlterados: string[] | null;
  dadosAnteriores: Record<string, unknown> | null;
  dadosNovos: Record<string, unknown> | null;
  ocorridoEm: Date;
}
