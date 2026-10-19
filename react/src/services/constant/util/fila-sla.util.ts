// Ordem de toda tabela com a coluna "esperando" (o SLA, DS-49): primeiro o que ainda espera uma pessoa, o mais antigo no
// topo; depois o que já foi resolvido, o mais novo primeiro. `esperandoDesde` devolve a data (ISO) desde quando a linha
// espera, ou null quando não espera nada; `data` é a data da linha, para ordenar as resolvidas.
export function ordenarFilaSla<T>(linhas: readonly T[], esperandoDesde: (linha: T) => string | null, data: (linha: T) => string): T[] {
  return [...linhas].sort((a, b) => {
    const esperaA = esperandoDesde(a);
    const esperaB = esperandoDesde(b);
    if (esperaA && esperaB) return esperaA.localeCompare(esperaB);
    if (esperaA || esperaB) return esperaA ? -1 : 1;
    return data(b).localeCompare(data(a));
  });
}
