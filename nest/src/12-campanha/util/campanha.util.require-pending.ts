import { ConflictException } from '@nestjs/common';
import type { Kysely } from 'kysely';
import type { DB } from '../../commons/database/db.types';

// Aprovar e rejeitar só valem para campanha "aguardando aprovação". O UPDATE desses services já filtra por esse
// status; quando ele não acha a linha, isto diz se foi por causa do status (409) antes de cair no 404/403 de
// distinguir404ou403. Sem o filtro, o admin rejeitava de novo uma campanha já rejeitada (e cada rejeição gasta um
// reenvio do pesquisador) ou reaprovava uma ativa (trocando a data de aprovação): trg_campanha_valida_transicao
// (05) libera qualquer transição para quem tem campanha_aprovar/campanha_rejeitar.
export async function exigirAguardandoAprovacao(
  db: Kysely<DB>,
  idCampanha: number,
  acao: 'aprovar' | 'rejeitar',
): Promise<void> {
  const atual = await db
    .selectFrom('campanha')
    .select('status')
    .where('id_campanha', '=', idCampanha)
    .executeTakeFirst();
  if (atual && atual.status !== 'aguardando_aprovacao') {
    throw new ConflictException(
      `Só é possível ${acao} uma campanha aguardando aprovação (status atual: ${atual.status}).`,
    );
  }
}
