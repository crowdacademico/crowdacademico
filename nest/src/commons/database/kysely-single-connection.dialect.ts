import {
  CompiledQuery,
  DatabaseConnection,
  DatabaseIntrospector,
  Dialect,
  DialectAdapter,
  Driver,
  Kysely,
  PostgresAdapter,
  PostgresIntrospector,
  PostgresQueryCompiler,
  QueryCompiler,
  QueryResult,
} from 'kysely';
import { PoolClient } from 'pg';

// Ponto 1 do "Probleminha-chan.md" (sugestão do Claude Web): o Kysely aqui
// NUNCA gerencia sua própria conexão/transação - ele só executa SQL em cima do
// MESMO PoolClient que o GlobalDbInterceptor já abriu, já rodou BEGIN e já
// setou app.id_usuario_atual via set_config(). Por isso beginTransaction/
// commitTransaction/rollbackTransaction/releaseConnection abaixo são no-op:
// não existe "transação do Kysely" aqui, ela já está aberta por fora.
// Consequência que serviços precisam saber: NÃO chame `db.transaction()` - não
// tem savepoint implementado, ia silenciosamente não fazer nada. Se precisar
// desfazer algo no meio de uma operação, use RAISE EXCEPTION no banco (mesmo
// padrão que 05_regras_negocio.sql já usa em todo lugar) - o
// GlobalDbInterceptor faz o ROLLBACK de verdade da transação inteira.
//
// ⚠️ CORRIGINDO O QUE O PARÁGRAFO ACIMA NÃO DIZIA (bug real, achado e
// corrigido 09-08-2026, ver auth.service.login.ts/listarPapeis): um erro de
// Postgres deixa a TRANSAÇÃO INTEIRA "abortada" até um ROLLBACK de verdade -
// pegar a exceção com try/catch NO LADO DO JAVASCRIPT e seguir chamando mais
// queries no MESMO `db` NÃO desfaz isso. As próximas queries até podem
// "funcionar" sem lançar erro (o driver não necessariamente recusa na hora),
// mas o COMMIT final do GlobalDbInterceptor vira silenciosamente um ROLLBACK
// (é o que o próprio Postgres faz quando pede COMMIT numa transação já
// abortada) - TUDO que a requisição gravou antes do erro some junto, mesmo a
// resposta HTTP tendo voltado 200 com dado que parecia certo (lido de dentro
// da transação, antes dela abortar). Se um service PRECISA tentar algo que
// pode falhar e continuar mesmo assim, tem que envolver só aquele trecho com
// SAVEPOINT/ROLLBACK TO SAVEPOINT via `sql` cru (não db.transaction(), que
// não suporta isso aqui) - nunca um try/catch pelado em volta de uma query.
class SingleConnection implements DatabaseConnection {
  constructor(private readonly client: PoolClient) {}

  async executeQuery<R>(compiledQuery: CompiledQuery): Promise<QueryResult<R>> {
    const resultado = await this.client.query(
      compiledQuery.sql,
      compiledQuery.parameters as unknown[],
    );
    return {
      rows: resultado.rows as R[],
      numAffectedRows:
        resultado.rowCount != null ? BigInt(resultado.rowCount) : undefined,
    };
  }

  // eslint-disable-next-line require-yield, @typescript-eslint/require-await -- assinatura exigida pela interface DatabaseConnection do Kysely
  async *streamQuery<R>(): AsyncIterableIterator<QueryResult<R>> {
    throw new Error(
      'Streaming não é suportado por KyselySingleConnectionDialect - nenhum ' +
        'módulo usa .stream() hoje; se precisar, isso vai exigir um driver diferente.',
    );
  }
}

class SingleConnectionDriver implements Driver {
  constructor(private readonly client: PoolClient) {}
  async init(): Promise<void> {}
  // eslint-disable-next-line @typescript-eslint/require-await -- assinatura exigida pela interface Driver do Kysely
  async acquireConnection(): Promise<DatabaseConnection> {
    return new SingleConnection(this.client);
  }
  async beginTransaction(): Promise<void> {}
  async commitTransaction(): Promise<void> {}
  async rollbackTransaction(): Promise<void> {}
  async releaseConnection(): Promise<void> {}
  async destroy(): Promise<void> {}
}

export class KyselySingleConnectionDialect implements Dialect {
  constructor(private readonly client: PoolClient) {}

  createDriver(): Driver {
    return new SingleConnectionDriver(this.client);
  }
  createQueryCompiler(): QueryCompiler {
    return new PostgresQueryCompiler();
  }
  createAdapter(): DialectAdapter {
    return new PostgresAdapter();
  }
  createIntrospector(db: Kysely<any>): DatabaseIntrospector {
    return new PostgresIntrospector(db);
  }
}
