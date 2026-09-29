import { Kysely } from 'kysely';
import { DB } from '../../commons/database/db.types';

// A conta tem perfil de pesquisador? Vai junto dos dados da conta (login, renovação, GET /usuario/:id e a resposta
// do PATCH) para a tela só pedir GET /perfil-pesquisador/:id de quem é pesquisador, em vez de pedir de todo mundo e
// receber 404 de quem não é.
export async function ehPesquisador(
  db: Kysely<DB>,
  idUsuario: number,
): Promise<boolean> {
  const perfil = await db
    .selectFrom('perfil_pesquisador')
    .select('id_usuario')
    .where('id_usuario', '=', idUsuario)
    .executeTakeFirst();
  return perfil !== undefined;
}
