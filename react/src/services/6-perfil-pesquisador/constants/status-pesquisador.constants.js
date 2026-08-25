// Espelha o ENUM status_pesquisador (01_extensoes_enums_tabelas.sql).
export const ROTULO_STATUS_PESQUISADOR = {
  ativo: 'Ativo',
  suspenso: 'Suspenso',
};

export function classeBadgeStatusPesquisador(status) {
  return status === 'ativo' ? 'badge-sucesso' : 'badge-erro';
}

export const ROTULO_TITULO_ACADEMICO = {
  graduado: 'Graduado',
  especialista: 'Especialista',
  mestre: 'Mestre',
  doutor: 'Doutor',
};

export const ROTULO_TIPO_VINCULO = {
  institucional: 'Institucional',
  independente: 'Independente',
};
