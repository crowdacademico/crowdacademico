import { Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseService } from '../../commons/database/database.service';
import { ContribuicaoResponseSummary } from '../dto/response/contribuicao.response-summary';

interface LinhaResumo {
  pagas: number;
  total: number;
}

// GET /contribuicao/campanha/:idCampanha/resumo: quantas contribuições estão pagas e quantas existem no total. Quem
// pode ler (o dono da campanha ou contribuicao_visualizar_sensivel) é decidido por resumo_contribuicoes_campanha()
// (05, 92038).
@Injectable()
export class ContribuicaoServiceSummary {
  constructor(private readonly database: DatabaseService) {}

  async executar(idCampanha: number): Promise<ContribuicaoResponseSummary> {
    const resultado = await sql<LinhaResumo>`
      SELECT * FROM public.resumo_contribuicoes_campanha(${idCampanha})`.execute(
      this.database.getDb(),
    );
    const linha = resultado.rows[0];
    return { pagas: Number(linha.pagas), total: Number(linha.total) };
  }
}
