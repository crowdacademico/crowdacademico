// Troca de `Promise.all` para quando as consultas usam o MESMO `db` da requisição: é uma conexão só (ver
// paginacao.util.ts), então elas nunca rodariam em paralelo de verdade, e o driver `pg` já avisa que vai deixar de
// enfileirar consulta disparada com outra em andamento. Roda uma depois da outra e devolve na mesma ordem, com o
// tipo de cada posição preservado.
export async function emSequencia<
  T extends readonly (() => Promise<unknown>)[] | [],
>(
  tarefas: T,
): Promise<{ -readonly [K in keyof T]: Awaited<ReturnType<T[K]>> }> {
  const resultados: unknown[] = [];
  for (const tarefa of tarefas) {
    resultados.push(await tarefa());
  }
  return resultados as { -readonly [K in keyof T]: Awaited<ReturnType<T[K]>> };
}
