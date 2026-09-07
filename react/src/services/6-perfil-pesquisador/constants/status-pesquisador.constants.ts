// Espelha o ENUM status_pesquisador (01_extensoes_enums_tabelas.sql).
export type StatusPesquisador = 'ativo' | 'suspenso';

export const ROTULO_STATUS_PESQUISADOR: Record<StatusPesquisador, string> = {
  ativo: 'Ativo',
  suspenso: 'Suspenso',
};

export function classeBadgeStatusPesquisador(status: StatusPesquisador): string {
  return status === 'ativo' ? 'badge-sucesso' : 'badge-erro';
}

// Espelha o ENUM titulo_academico.
export type TituloAcademico = 'graduado' | 'especialista' | 'mestre' | 'doutor';

export const ROTULO_TITULO_ACADEMICO: Record<TituloAcademico, string> = {
  graduado: 'Graduado',
  especialista: 'Especialista',
  mestre: 'Mestre',
  doutor: 'Doutor',
};

// Espelha o ENUM tipo_vinculo.
export type TipoVinculo = 'institucional' | 'independente';

export const ROTULO_TIPO_VINCULO: Record<TipoVinculo, string> = {
  institucional: 'Institucional',
  independente: 'Independente',
};
