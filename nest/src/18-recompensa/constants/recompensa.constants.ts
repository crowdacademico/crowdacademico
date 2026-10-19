export const RECOMPENSA_COLUNAS_SELECT = [
  'id_recompensa',
  'id_campanha',
  'titulo',
  'descricao',
  'valor_minimo',
  'tipo',
  'ativo',
  'criado_em',
] as const;

// Contribuição que conta como "ganhou a recompensa": a que foi paga (e o que veio depois disso). Pendente, vencida
// ou com erro não conta.
export const STATUS_CONTRIBUICAO_PAGA = [
  'confirmado',
  'repassado',
  'a_devolver',
  'devolvido',
  'reembolsado',
  'reembolso_manual',
] as const;
