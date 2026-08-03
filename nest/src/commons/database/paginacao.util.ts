import { SelectQueryBuilder } from 'kysely';

// Achado do Claude Web (03-08-2026): usuario.service.findall.ts e
// configuracao.service.findall.ts fazem `.execute()` sem `limit`/`offset`
// nenhum — hoje invisível (17 usuários, 28 configurações), mas o mesmo
// padrão copiado pra contribuicao/auditoria_financeira/notificacao (ainda
// não construídos, só `.gitkeep`) baixaria a tabela inteira do banco pra
// mostrar 10 linhas na tela. `paginar()` é a base genérica pra qualquer
// findall novo não repetir isso — 2 linhas em vez de escrever
// LIMIT/OFFSET/COUNT na mão em cada service.
//
// Uso: monte a query normalmente (select/where/orderBy) e troque só o
// `.execute()` final por `await paginar(query, paginacao)`.
//
// Nesta rodada (03-08-2026), `TAMANHO_PAGINA_PADRAO`/`TAMANHO_PAGINA_MAXIMO`
// ficaram deliberadamente altos (500): usuario/configuracao usam isto hoje
// só como TETO DE SEGURANÇA (nenhum SELECT sem limite nunca mais), não como
// paginação de verdade exposta na tela — GenericTable (React) continua
// buscando a lista inteira de uma vez e paginando no navegador, do jeito que
// já funciona bem pra tabelas pequenas. Quando um módulo de alto volume
// existir de verdade (contribuicao, notificacao...), ESSE módulo deve
// escolher um `tamanho` padrão pequeno (ex.: 20) e o React precisa ganhar
// controles de página que chamem a API de novo a cada troca — troque o
// padrão aqui só quando isso acontecer, não antes (não faz sentido construir
// a tela de paginação contra 17 linhas de teste).
export const TAMANHO_PAGINA_PADRAO = 500;
export const TAMANHO_PAGINA_MAXIMO = 500;

export interface ParametrosPaginacao {
  pagina?: number;
  tamanho?: number;
}

export interface ResultadoPaginado<T> {
  dados: T[];
  total: number;
  pagina: number;
  tamanho: number;
}

export async function paginar<DB, TB extends keyof DB, O>(
  query: SelectQueryBuilder<DB, TB, O>,
  parametros: ParametrosPaginacao = {},
): Promise<ResultadoPaginado<O>> {
  const pagina = Math.max(1, parametros.pagina ?? 1);
  const tamanho = Math.min(
    TAMANHO_PAGINA_MAXIMO,
    Math.max(1, parametros.tamanho ?? TAMANHO_PAGINA_PADRAO),
  );

  // Kysely é imutável — `.limit()`/`.clearSelect()` devolvem uma query NOVA,
  // as duas chamadas abaixo partem da mesma `query` original sem uma afetar
  // a outra. `clearSelect`/`clearOrderBy` mantêm o `where` (é só isso que a
  // contagem precisa) e descartam ORDER BY (irrelevante e mais lento pra
  // COUNT).
  // Cast no resultado da contagem: com DB/TB genéricos (não a shape
  // concreta do banco), o TS não consegue resolver o tipo de retorno de
  // `.select(...)` encadeado em cima de `.clearSelect()` — infere uma união
  // ampla (InsertResult | DeleteResult | ...) que nunca acontece de verdade
  // aqui (a query é sempre um SELECT com uma única coluna agregada `total`).
  const [dados, contagem] = await Promise.all([
    query
      .limit(tamanho)
      .offset((pagina - 1) * tamanho)
      .execute(),
    query
      .clearSelect()
      .clearOrderBy()
      .select((eb) => eb.fn.countAll<number>().as('total'))
      .executeTakeFirstOrThrow() as Promise<{
      total: number | string | bigint;
    }>,
  ]);

  return {
    dados,
    // Alguns drivers (pg incluso) devolvem COUNT como string quando o valor
    // passa do range seguro de `number` do JS — `Number(...)` normaliza os
    // dois casos; pra chegar no ponto do range estourar, precisaria de mais
    // de 2^53 linhas na tabela, o que não é uma preocupação real aqui.
    total: Number(contagem.total),
    pagina,
    tamanho,
  };
}
