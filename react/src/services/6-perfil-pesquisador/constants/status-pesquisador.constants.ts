import type { StatusPesquisador, TipoVinculo, TituloAcademico } from '../../constant/type/enums-do-banco.gerado';

// Os VALORES dos três ENUMs abaixo vêm do banco (enums-do-banco.gerado.ts); aqui ficam só os rótulos. Os rótulos são
// Record<Tipo, string>: um valor novo no banco sem rótulo aqui vira erro de compilação.
export type { StatusPesquisador, TipoVinculo, TituloAcademico };

export const ROTULO_STATUS_PESQUISADOR: Record<StatusPesquisador, string> = {
  ativo: 'Ativo',
  suspenso: 'Suspenso',
};

export function classeBadgeStatusPesquisador(status: StatusPesquisador): string {
  return status === 'ativo' ? 'badge-sucesso' : 'badge-erro';
}

export const ROTULO_TITULO_ACADEMICO: Record<TituloAcademico, string> = {
  graduado: 'Graduado',
  especialista: 'Especialista',
  mestre: 'Mestre',
  doutor: 'Doutor',
};

export const ROTULO_TIPO_VINCULO: Record<TipoVinculo, string> = {
  institucional: 'Institucional',
  independente: 'Independente',
};
