import { ForbiddenException } from '@nestjs/common';
import { sql, type Kysely } from 'kysely';
import type { DB } from '../database/db.types';

// Bloqueio parcial do e-mail não confirmado (22-11-2026). Quem não confirmou o e-mail entra e navega, mas não pede o
// perfil de pesquisador, não envia campanha para análise e não comenta. O apoio fica liberado de propósito: travar o
// momento do dinheiro afasta quem quer contribuir, e o modal Apoiar mostra o e-mail do recibo para a pessoa conferir.
//
// Por que não o bloqueio total (sem confirmar, não entra): é o modelo mais raro hoje, porque aumenta a desistência
// no cadastro, e prende quem perdeu o link. O parcial é o modelo do GitHub e o mais comum em plataformas com dinheiro
// ou publicação. Ver DOCUMENTACAO_BACKEND.md, "E-mail não confirmado".
//
// No Nest, não no banco: é regra de uso (o que a tela libera), não de integridade dos dados, e as contas criadas pelo
// painel ou pelos testes do banco seguem válidas sem confirmação.
export async function exigirEmailConfirmado(
  db: Kysely<DB>,
  acao: string,
): Promise<void> {
  const resultado = await sql<{ confirmado: boolean | null }>`
    SELECT email_verificado AS confirmado FROM usuario WHERE id_usuario = public.id_usuario_atual()
  `.execute(db);
  if (resultado.rows[0]?.confirmado === false) {
    throw new ForbiddenException(
      `Confirme o seu e-mail para ${acao}. Abra o link que enviamos para a sua caixa de entrada ou peça outro no aviso do topo da página.`,
    );
  }
}
