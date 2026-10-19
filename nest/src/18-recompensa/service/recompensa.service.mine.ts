import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { STATUS_CONTRIBUICAO_PAGA } from '../constants/recompensa.constants';
import { RecompensaConverter } from '../dto/converter/recompensa.converter';
import { RecompensaGanhaResponse } from '../dto/response/recompensa.response';

// As recompensas que a própria conta ganhou (RF-101), com o link especial. Só contribuição paga conta.
@Injectable()
export class RecompensaServiceMine {
  constructor(private readonly database: DatabaseService) {}

  async executar(idUsuario: number): Promise<RecompensaGanhaResponse[]> {
    const db = this.database.getDb();
    const linhas = await db
      .selectFrom('contribuicao_recompensa as cr')
      .innerJoin('contribuicao as c', 'c.id_contribuicao', 'cr.id_contribuicao')
      .innerJoin('recompensa as r', 'r.id_recompensa', 'cr.id_recompensa')
      .innerJoin('campanha as ca', 'ca.id_campanha', 'r.id_campanha')
      .select([
        'r.id_recompensa',
        'r.id_campanha',
        'ca.titulo as titulo_campanha',
        'r.titulo',
        'r.descricao',
        'r.tipo',
        'c.id_contribuicao',
      ])
      .where('c.id_usuario', '=', idUsuario)
      .where('c.status', 'in', STATUS_CONTRIBUICAO_PAGA)
      .orderBy('cr.adquirida_em', 'desc')
      .execute();
    if (linhas.length === 0) return [];

    const links = await db
      .selectFrom('link_recompensa')
      .selectAll()
      .where(
        'id_recompensa',
        'in',
        linhas.map((l) => l.id_recompensa),
      )
      .execute();
    return linhas.map((l) => ({
      idRecompensa: l.id_recompensa,
      idCampanha: l.id_campanha,
      tituloCampanha: l.titulo_campanha,
      titulo: l.titulo,
      descricao: l.descricao,
      tipo: l.tipo,
      idContribuicao: l.id_contribuicao,
      links: links
        .filter((link) => link.id_recompensa === l.id_recompensa)
        .map((link) => RecompensaConverter.paraLink(link)),
    }));
  }
}
