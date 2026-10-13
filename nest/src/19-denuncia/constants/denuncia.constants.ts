// Situações que a moderação escolhe ao julgar. 'em_analise' existe no tipo do banco, mas está fora de uso
// (CK_DENUNCIA_SEM_EM_ANALISE, 01).
export const STATUS_DENUNCIA_JULGAMENTO = [
  'pendente',
  'resolvida',
  'improcedente',
] as const;

export const DENUNCIA_COLUNAS_SELECT = [
  'id_denuncia',
  'id_usuario',
  'id_campanha_alvo',
  'id_pesquisador_alvo',
  'id_motivo',
  'relato',
  'status',
  'justificativa_moderacao',
  'id_julgador',
  'julgado_em',
  'id_julgador_contestacao',
  'contestacao',
  'contestacao_status',
  'contestada_em',
  'justificativa_contestacao',
  'criado_em',
] as const;
