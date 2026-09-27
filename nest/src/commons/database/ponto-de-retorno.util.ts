import { sql } from 'kysely';
import type { Kysely } from 'kysely';
import type { DB } from './db.types';

// Toda requisição roda numa transação só (GlobalDbInterceptor). Quando um comando falha dentro dela, o Postgres
// recusa qualquer comando seguinte ("current transaction is aborted"). Um SAVEPOINT antes do comando permite
// voltar só até ali se ele falhar, e a transação continua usável (ex.: contar os registros que impediram uma
// exclusão, para a mensagem do 409). O erro original é sempre relançado.
export async function comPontoDeRetorno<T>(
  db: Kysely<DB>,
  comando: () => Promise<T>,
): Promise<T> {
  await sql`SAVEPOINT ponto_de_retorno`.execute(db);
  try {
    const resultado = await comando();
    await sql`RELEASE SAVEPOINT ponto_de_retorno`.execute(db);
    return resultado;
  } catch (erro) {
    await sql`ROLLBACK TO SAVEPOINT ponto_de_retorno`.execute(db);
    throw erro;
  }
}
