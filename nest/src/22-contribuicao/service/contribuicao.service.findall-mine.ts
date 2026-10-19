import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { ContribuicaoResponseMine } from '../dto/response/contribuicao.response-mine';

// GET /contribuicao/minhas: o histórico de contribuições da própria conta (RF-009, RF-085), com a campanha, o meio, a
// situação e a recompensa escolhida (RF-101). pol_contribuicao_select (04) só devolve as linhas da sessão; o WHERE
// repete isso para a consulta usar o índice. Mais nova primeiro.
@Injectable()
export class ContribuicaoServiceFindAllMine {
  constructor(private readonly database: DatabaseService) {}

  async executar(idUsuario: number): Promise<ContribuicaoResponseMine[]> {
    const linhas = await this.database
      .getDb()
      .selectFrom('contribuicao as c')
      .leftJoin('campanha as ca', 'ca.id_campanha', 'c.id_campanha')
      .leftJoin(
        'contribuicao_recompensa as cr',
        'cr.id_contribuicao',
        'c.id_contribuicao',
      )
      .leftJoin('recompensa as r', 'r.id_recompensa', 'cr.id_recompensa')
      .select([
        'c.id_contribuicao',
        'c.id_campanha',
        'ca.titulo as titulo_campanha',
        'c.valor',
        'c.meio_pagamento',
        'c.status',
        'c.anonima',
        'c.criado_em',
        'r.titulo as titulo_recompensa',
      ])
      .where('c.id_usuario', '=', idUsuario)
      .orderBy('c.criado_em', 'desc')
      .orderBy('c.id_contribuicao', 'desc')
      .execute();

    return linhas.map((l) => ({
      idContribuicao: l.id_contribuicao,
      idCampanha: l.id_campanha,
      tituloCampanha: l.titulo_campanha,
      valor: Number(l.valor),
      meioPagamento: l.meio_pagamento,
      status: l.status,
      anonima: l.anonima,
      criadoEm: l.criado_em,
      tituloRecompensa: l.titulo_recompensa,
    }));
  }
}
