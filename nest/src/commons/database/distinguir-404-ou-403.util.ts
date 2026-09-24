import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Kysely, sql } from 'kysely';
import { DB } from './db.types';

// Extraído (23-09-2026) - o mesmo bloco de 5 linhas se repetia em ~27
// services: um UPDATE/DELETE que afetou 0 linhas pode ser "não existe" OU
// "existe mas a RLS bloqueou" (dono/permissão faltando), e só um SELECT à
// parte (sempre visível, pol_*_select costuma ser mais aberta que
// pol_*_update/delete) distingue os dois - sem isso, todo mundo sem
// permissão veria 404 (vaza que existe) em vez do 403 correto.
//
// `sql.table`/`sql.ref` (não string interpolada direto) - identificador
// escapado corretamente pelo Kysely, mesmo sem risco real de injeção aqui
// (tabela/coluna são sempre literais escritos no código, nunca entrada do
// usuário). Via `sql` em vez do query builder tipado porque os genéricos do
// Kysely (`selectFrom<TB>`) não resolvem bem quando TB é um type parameter
// abstrato, não uma união de literais - a mesma limitação que levou os
// outros services a NUNCA terem uma versão genérica disso antes.
//
// `mensagemProibido` é a mensagem INTEIRA, não um template - alguns
// chamadores (ex.: CampanhaServiceRemove, CampanhaServiceEnviar) combinam a
// regra de permissão com uma regra de negócio na mesma frase ("só é
// possível excluir uma campanha em rascunho, e só o dono..."), então forçar
// um "Sem permissão para {acao}" genérico mudaria o texto que o usuário vê.
export async function distinguir404ou403<TB extends keyof DB>(
  db: Kysely<DB>,
  tabela: TB,
  coluna: keyof DB[TB] & string,
  valor: number | string,
  mensagemNaoEncontrado: string,
  mensagemProibido: string,
): Promise<never> {
  const resultado = await sql<{ existe: number }>`
    SELECT 1 AS existe FROM ${sql.table(tabela)} WHERE ${sql.ref(coluna)} = ${valor} LIMIT 1
  `.execute(db);

  if (resultado.rows.length === 0) {
    throw new NotFoundException(mensagemNaoEncontrado);
  }
  throw new ForbiddenException(mensagemProibido);
}
