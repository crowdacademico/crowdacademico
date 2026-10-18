import { Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseService } from '../../commons/database/database.service';
import { ContribuicaoResponseSummary } from '../dto/response/contribuicao.response-summary';

interface LinhaResumo {
  meio_pagamento: string;
  status: string;
  quantidade: number;
  total: string;
}

// GET /contribuicao/campanha/:idCampanha/resumo: quantas e quanto, por meio de pagamento e situação. Quem pode ler
// (o dono da campanha ou contribuicao_visualizar_sensivel) é decidido por resumo_contribuicoes_campanha() (05, 92038).
@Injectable()
export class ContribuicaoServiceSummary {
  constructor(private readonly database: DatabaseService) {}

  async executar(idCampanha: number): Promise<ContribuicaoResponseSummary[]> {
    const resultado = await sql<LinhaResumo>`
      SELECT * FROM public.resumo_contribuicoes_campanha(${idCampanha})`.execute(
      this.database.getDb(),
    );
    return resultado.rows.map((linha) => ({
      meioPagamento: linha.meio_pagamento,
      status: linha.status,
      quantidade: Number(linha.quantidade),
      total: Number(linha.total),
    }));
  }
}
