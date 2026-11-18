import { sql, type Kysely } from 'kysely';
import type { DB } from '../../commons/database/db.types';
import type { DadosContaGoogle } from '../service/auth.service.google-token';

// Chama entrar_com_google() (03, [03-O]): o banco decide a conta (já ligada ao sub, a do mesmo e-mail, ou uma nova) e
// devolve o id, ou null quando o e-mail é de uma conta excluída. Recusas viram erro do banco (90042, 91062), traduzido
// pelo PostgresExceptionFilter. Separado do service para os testes trocarem o banco por um falso.
export async function entrarComGoogleNoBanco(
  db: Kysely<DB>,
  dados: DadosContaGoogle,
): Promise<number | null> {
  const resultado = await sql<{ id_usuario: number | null }>`
    SELECT public.entrar_com_google(${dados.sub}, ${dados.email}, ${dados.nome}) AS id_usuario
  `.execute(db);
  // Um SELECT sem FROM devolve sempre uma linha.
  const [linha] = resultado.rows;
  return linha.id_usuario;
}
