// Separado de `rodape-paginacao.tsx`: react-refresh exige que um arquivo de COMPONENTE só exporte componentes;
// constante/tipo compartilhado vai num arquivo próprio.
export const TAMANHOS_PAGINA = [10, 20, 30, 'todos'] as const;

// `number | 'todos'` (não `(typeof TAMANHOS_PAGINA)[number]`, que travaria
// em `10 | 20 | 30 | 'todos'`) - o tamanho de verdade pode vir de fora
// desse menu fixo (ex.: `generic-table.tsx` faz `Number(param) ||
// TAMANHOS_PAGINA[0]` a partir da URL, sem garantia estática de bater com
// uma das 3 opções).
export type TamanhoPagina = number | 'todos';
