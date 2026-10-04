import { Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseService } from '../../commons/database/database.service';
import { ScoreConfigRequestUpdate } from '../dto/request/score-config.request-update';
import { ScoreConfigResponse } from '../dto/response/score-config.response';
import { ScoreConfigServiceFindAll } from './score-config.service.findall';
import {
  conferirIdsUnicos,
  conferirLinhas,
} from './score-config.util.conferir-linhas';

// Grava todos os pesos num comando só: a trigger de recálculo roda uma vez (não uma por item), e a soma 100 (90017),
// o peso negativo (90030) e a dimensão sem subitem ativo (90031) são conferidos logo depois, no estado final.
@Injectable()
export class ScoreConfigServiceUpdate {
  constructor(
    private readonly database: DatabaseService,
    private readonly findAll: ScoreConfigServiceFindAll,
  ) {}

  async executar(dto: ScoreConfigRequestUpdate): Promise<ScoreConfigResponse> {
    const db = this.database.getDb();
    conferirIdsUnicos(dto.itens.map((item) => item.idScoreConfig));
    const valores = sql.join(
      dto.itens.map(
        (item) =>
          sql`(${item.idScoreConfig}::int, ${item.peso}::numeric, ${item.ativo}::boolean)`,
      ),
    );
    const resultado = await sql`
      UPDATE score_config sc SET peso = v.peso, ativo = v.ativo
      FROM (VALUES ${valores}) AS v(id, peso, ativo)
      WHERE sc.id_score_config = v.id`.execute(db);
    conferirLinhas(Number(resultado.numAffectedRows ?? 0), dto.itens.length);
    await sql`SET CONSTRAINTS ALL IMMEDIATE`.execute(db);
    return this.findAll.executar();
  }
}
