// Extraído (13-09-2026, achado A2 do contra-prompt do Claude Web) - a
// mesma conta de paginação client-side (total de páginas, página atual
// grudada no teto quando o filtro encolhe a lista, fatiar os itens da
// página) aparecia idêntica em 4 lugares: GenericTable, bancada-
// pesquisador.tsx, bancada-campanha.tsx, registro-chamadas.tsx. Extraída só
// a CONTA (função pura), não um hook - cada um dos 4 guarda `pagina`/
// `tamanhoPagina` do seu próprio jeito (GenericTable usa searchParams da
// URL, os outros 3 usam useState simples); um hook "usePaginacaoClientSide"
// teria que também assumir ONDE mora o estado, o que os 4 chamadores não
// compartilham - a função pura serve os 4 sem forçar nenhum deles a mudar
// como guardam `pagina`.
//
// `tamanhoPagina === 'todos'` (pedido do Lucas: opção de ver 10/20/30/todos
// os registros, além de Anterior/Próxima) vira 1 página só, com a lista
// inteira - mesma regra nos 4 lugares.
export interface ResultadoPaginacaoClientSide<T> {
  totalPaginas: number;
  paginaAtual: number;
  itensPagina: T[];
}

export function paginarClientSide<T>(
  itens: T[],
  pagina: number,
  tamanhoPagina: number | 'todos',
): ResultadoPaginacaoClientSide<T> {
  const totalPaginas = tamanhoPagina === 'todos' ? 1 : Math.max(1, Math.ceil(itens.length / tamanhoPagina));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const itensPagina =
    tamanhoPagina === 'todos' ? itens : itens.slice((paginaAtual - 1) * tamanhoPagina, paginaAtual * tamanhoPagina);
  return { totalPaginas, paginaAtual, itensPagina };
}
