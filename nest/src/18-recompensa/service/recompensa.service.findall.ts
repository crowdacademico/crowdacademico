import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import {
  RECOMPENSA_COLUNAS_SELECT,
  STATUS_CONTRIBUICAO_PAGA,
} from '../constants/recompensa.constants';
import { RecompensaConverter } from '../dto/converter/recompensa.converter';
import { RecompensaResponse } from '../dto/response/recompensa.response';

// As recompensas de uma campanha. A leitura é pública (pol_recompensa_select); os links e a contagem de escolhidas
// passam pela RLS: o dono da campanha e o admin veem tudo, quem ganhou vê o link da própria recompensa, e o resto
// recebe links vazios e contagem zero. Inativas vêm junto, marcadas: a tela do dono mostra, a pública esconde.
@Injectable()
export class RecompensaServiceFindAll {
  constructor(private readonly database: DatabaseService) {}

  async executar(idCampanha: number): Promise<RecompensaResponse[]> {
    const db = this.database.getDb();
    const recompensas = await db
      .selectFrom('recompensa')
      .select(RECOMPENSA_COLUNAS_SELECT)
      .where('id_campanha', '=', idCampanha)
      .orderBy('valor_minimo')
      .orderBy('id_recompensa')
      .execute();
    if (recompensas.length === 0) return [];

    const ids = recompensas.map((r) => r.id_recompensa);
    const links = await db
      .selectFrom('link_recompensa')
      .selectAll()
      .where('id_recompensa', 'in', ids)
      .orderBy('ordem')
      .orderBy('id_link_recompensa')
      .execute();
    const contagens = await db
      .selectFrom('contribuicao_recompensa as cr')
      .innerJoin('contribuicao as c', 'c.id_contribuicao', 'cr.id_contribuicao')
      .select((eb) => [
        'cr.id_recompensa',
        eb.fn.countAll<string>().as('total'),
      ])
      .where('cr.id_recompensa', 'in', ids)
      .where('c.status', 'in', STATUS_CONTRIBUICAO_PAGA)
      .groupBy('cr.id_recompensa')
      .execute();

    return recompensas.map((r) =>
      RecompensaConverter.paraResponseDto(
        r,
        Number(
          contagens.find((c) => c.id_recompensa === r.id_recompensa)?.total ??
            0,
        ),
        links.filter((l) => l.id_recompensa === r.id_recompensa),
      ),
    );
  }
}
