import { ConflictException } from '@nestjs/common';
import { Kysely, sql } from 'kysely';
import { DB } from './db.types';
import { distinguir404ou403 } from './distinguir-404-ou-403.util';
import {
  ItemEmUso,
  mensagemExclusaoEmUso,
  UsoDoItem,
} from './mensagem-exclusao-em-uso.util';
import { comPontoDeRetorno } from './ponto-de-retorno.util';
import { CODIGO_PG_FOREIGN_KEY_VIOLATION } from './postgres-exception.filter';
import { rotuloDeUso } from './rotulos-de-uso.constants';
import { temCodigoPostgres } from './codigo-postgres.util';

// Excluir um registro que outras tabelas podem estar usando (catálogos sem CASCADE de propósito). Numa só
// chamada: DELETE dentro de um ponto de retorno; 0 linhas vira 404 ou 403 (distinguir404ou403); chave
// estrangeira barrando vira 409 dizendo onde e quantas vezes está em uso.
//
// QUAIS tabelas contar não é escrito à mão: vem do próprio Postgres (pg_constraint), então uma tabela nova que
// passe a apontar para o catálogo entra na contagem sozinha. Só as chaves que BARRAM a exclusão (NO ACTION /
// RESTRICT) contam; as SET NULL / CASCADE não impedem nada. O nome amigável de cada tabela vem de
// rotulos-de-uso.constants.ts.
interface ExclusaoComContagem<TB extends keyof DB> {
  tabela: TB;
  coluna: keyof DB[TB] & string;
  id: number;
  item: ItemEmUso;
  mensagemNaoEncontrado: string;
  mensagemProibido: string;
}

export async function excluirComContagemDeUso<TB extends keyof DB>(
  db: Kysely<DB>,
  opcoes: ExclusaoComContagem<TB>,
): Promise<void> {
  const { tabela, coluna, id } = opcoes;
  try {
    const resultado = await comPontoDeRetorno(db, () =>
      sql`DELETE FROM ${sql.table(tabela)} WHERE ${sql.ref(coluna)} = ${id}`.execute(
        db,
      ),
    );
    if ((resultado.numAffectedRows ?? 0n) === 0n) {
      const filtro = { [coluna]: id } as Partial<
        Record<keyof DB[TB] & string, number>
      >;
      await distinguir404ou403(
        db,
        tabela,
        filtro,
        opcoes.mensagemNaoEncontrado,
        opcoes.mensagemProibido,
      );
    }
  } catch (erro) {
    if (temCodigoPostgres(erro, CODIGO_PG_FOREIGN_KEY_VIOLATION)) {
      // A transação voltou ao ponto de retorno: ainda aceita as contagens.
      throw new ConflictException(
        mensagemExclusaoEmUso(opcoes.item, await contarUsos(db, tabela, id)),
      );
    }
    throw erro;
  }
}

async function contarUsos(
  db: Kysely<DB>,
  tabela: string,
  id: number,
): Promise<UsoDoItem[]> {
  const { rows: chaves } = await sql<{ tabela: string; coluna: string }>`
    SELECT c.conrelid::regclass::text AS tabela, a.attname AS coluna
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
    WHERE c.contype = 'f'
      AND c.confrelid = ${tabela}::regclass
      AND cardinality(c.conkey) = 1
      AND c.confdeltype IN ('a', 'r')
    ORDER BY 1
  `.execute(db);

  const usos: UsoDoItem[] = [];
  for (const chave of chaves) {
    const { rows } = await sql<{ total: string }>`
      SELECT count(*) AS total FROM ${sql.table(chave.tabela)} WHERE ${sql.ref(chave.coluna)} = ${id}
    `.execute(db);
    usos.push({
      quantidade: Number(rows[0]?.total ?? 0),
      ...rotuloDeUso(chave.tabela),
    });
  }
  return usos;
}
