import { Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseService } from '../../commons/database/database.service';
import { ContribuicaoResponseMine } from '../dto/response/contribuicao.response-mine';

// GET /contribuicao/minhas: o histórico de contribuições da própria conta (RF-009, RF-089), com a campanha, o meio, a
// situação e as recompensas ganhas (RF-105, todas as que o valor alcançou, fn_concede_recompensas, 05). pol_contribuicao_select (04) só devolve as linhas da sessão; o WHERE
// repete isso para a consulta usar o índice. Mais nova primeiro.
@Injectable()
export class ContribuicaoServiceFindAllMine {
  constructor(private readonly database: DatabaseService) {}

  async executar(idUsuario: number): Promise<ContribuicaoResponseMine[]> {
    const linhas = await this.database
      .getDb()
      .selectFrom('contribuicao as c')
      .leftJoin('campanha as ca', 'ca.id_campanha', 'c.id_campanha')
      .select([
        'c.id_contribuicao',
        'c.id_campanha',
        'ca.titulo as titulo_campanha',
        'c.valor',
        'c.taxa_pagamento',
        'c.id_repasse',
        'c.meio_pagamento',
        'c.status',
        'c.anonima',
        'c.criado_em',
      ])
      .select(
        sql<
          string | null
        >`(SELECT string_agg(r.titulo, ', ' ORDER BY r.valor_minimo)
          FROM contribuicao_recompensa cr JOIN recompensa r ON r.id_recompensa = cr.id_recompensa
          WHERE cr.id_contribuicao = c.id_contribuicao)`.as('recompensas'),
      )
      .where('c.id_usuario', '=', idUsuario)
      .orderBy('c.criado_em', 'desc')
      .orderBy('c.id_contribuicao', 'desc')
      .execute();

    return linhas.map((l) => ({
      idContribuicao: l.id_contribuicao,
      idCampanha: l.id_campanha,
      tituloCampanha: l.titulo_campanha,
      valor: Number(l.valor),
      taxaPagamento: Number(l.taxa_pagamento),
      idRepasse: l.id_repasse,
      meioPagamento: l.meio_pagamento,
      status: l.status,
      anonima: l.anonima,
      criadoEm: l.criado_em,
      recompensas: l.recompensas,
    }));
  }
}
