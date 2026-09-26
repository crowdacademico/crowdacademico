export const CAMPANHA_COLUNAS_SELECT = [
  'id_campanha',
  'id_usuario',
  'id_admin',
  'id_area_conhecimento',
  'titulo',
  'modelo',
  'meta_financeira',
  'valor_bruto_arrecadado',
  'taxa_plataforma',
  'descricao',
  'data_inicio',
  'data_fim',
  'status',
  'aprovado_em',
  'encerrado_em',
  'video_apresentacao_url',
  'criado_em',
] as const;

// Nome do campo no banco (fn_campanha_campos_bloqueados) -> nome no DTO de resposta.
export const CAMPO_BLOQUEADO_PARA_DTO: Record<string, string> = {
  titulo: 'titulo',
  descricao: 'descricao',
  meta_financeira: 'metaFinanceira',
  modelo: 'modelo',
  taxa_plataforma: 'taxaPlataforma',
  id_area_conhecimento: 'idAreaConhecimento',
  video_apresentacao_url: 'videoApresentacaoUrl',
  data_inicio: 'dataInicio',
  data_fim: 'dataFim',
};
