import { SelectQueryBuilder } from 'kysely';

// `paginar()` é a base genérica para qualquer findall novo não repetir `.execute()` sem `limit`/`offset` (que
// baixaria a tabela inteira do banco para mostrar 10 linhas na tela): 2 linhas em vez de escrever
// LIMIT/OFFSET/COUNT na mão em cada service.
//
// Uso: monte a query normalmente (select/where/orderBy) e troque só o `.execute()` final por `await
// paginar(query, paginacao)`.
//
// `TAMANHO_PAGINA_PADRAO`/`TAMANHO_PAGINA_MAXIMO` são deliberadamente altos (500): usuario/configuracao usam
// isto só como TETO DE SEGURANÇA (nenhum SELECT sem limite nunca mais), não como paginação de verdade exposta
// na tela; GenericTable (React) busca a lista inteira de uma vez e pagina no navegador, o que funciona bem para
// tabelas pequenas. Quando um módulo de alto volume existir de verdade (contribuicao, notificacao...), ESSE
// módulo deve escolher um `tamanho` padrão pequeno (ex.: 20) e o React precisa ganhar controles de página que
// chamem a API de novo a cada troca; troque o padrão aqui só quando isso acontecer, não antes.
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

  // Kysely é imutável: `.limit()`/`.clearSelect()` devolvem uma query NOVA, as duas chamadas abaixo partem da
  // mesma `query` original sem uma afetar a outra. `clearSelect`/`clearOrderBy` mantêm o `where` (é só isso que
  // a contagem precisa) e descartam ORDER BY (irrelevante e mais lento para COUNT).
  //
  // SEQUENCIAL, não Promise.all: o banco é acessado por UMA conexão só por requisição
  // (KyselySingleConnectionDialect, não um pool: é o que permite o SET LOCAL app.id_usuario_atual da RLS
  // funcionar), então essas duas queries NUNCA rodam em paralelo de verdade: o driver só enfileira por baixo
  // dos panos, e essa fila implícita é o comportamento que o pg vai remover numa versão futura (pg@9; hoje gera
  // o warning "Calling client.query() when the client is already executing a query is deprecated"). `await`
  // sequencial tem o mesmo tempo total, sem depender de comportamento que vai sumir.
  //
  // Cast no resultado da contagem: com DB/TB genéricos (não a shape concreta do banco), o TS não consegue
  // resolver o tipo de retorno de `.select(...)` encadeado em cima de `.clearSelect()`: infere uma união ampla
  // (InsertResult | DeleteResult | ...) que nunca acontece de verdade aqui (a query é sempre um SELECT com uma
  // única coluna agregada `total`).
  const dados = await query
    .limit(tamanho)
    .offset((pagina - 1) * tamanho)
    .execute();
  const contagem = (await query
    .clearSelect()
    .clearOrderBy()
    .select((eb) => eb.fn.countAll<number>().as('total'))
    .executeTakeFirstOrThrow()) as {
    total: number | string | bigint;
  };

  return {
    dados,
    // Alguns drivers (pg incluso) devolvem COUNT como string quando o valor
    // passa do range seguro de `number` do JS - `Number(...)` normaliza os
    // dois casos; pra chegar no ponto do range estourar, precisaria de mais
    // de 2^53 linhas na tabela, o que não é uma preocupação real aqui.
    total: Number(contagem.total),
    pagina,
    tamanho,
  };
}
