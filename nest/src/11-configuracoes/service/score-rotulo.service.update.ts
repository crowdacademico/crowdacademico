import { BadRequestException, Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { temCodigoPostgres } from '../../commons/database/codigo-postgres.util';
import { DatabaseService } from '../../commons/database/database.service';
import { ScoreRotuloRequestUpdate } from '../dto/request/score-rotulo.request-update';
import { ScoreConfigResponse } from '../dto/response/score-config.response';
import { ScoreConfigServiceFindAll } from './score-config.service.findall';
import {
  conferirIdsUnicos,
  conferirLinhas,
} from './score-config.util.conferir-linhas';

const CODIGO_PG_EXCLUSAO = '23P01';

// Grava todas as faixas num comando só: cobrir 0 a 100 sem buraco (90018) e sem sobreposição (23P01) é conferido
// no estado final, e o rótulo de todo mundo é recalculado uma vez.
@Injectable()
export class ScoreRotuloServiceUpdate {
  constructor(
    private readonly database: DatabaseService,
    private readonly findAll: ScoreConfigServiceFindAll,
  ) {}

  async executar(dto: ScoreRotuloRequestUpdate): Promise<ScoreConfigResponse> {
    const db = this.database.getDb();
    conferirIdsUnicos(dto.faixas.map((faixa) => faixa.idRotulo));
    for (const faixa of dto.faixas) {
      if (faixa.scoreMinimo >= faixa.scoreMaximo) {
        throw new BadRequestException(
          `A faixa "${faixa.rotulo.trim()}" precisa terminar depois de começar.`,
        );
      }
    }
    const valores = sql.join(
      dto.faixas.map(
        (faixa) =>
          sql`(${faixa.idRotulo}::int, ${faixa.rotulo.trim()}::varchar, ${faixa.descricao?.trim() || null}::varchar, ${faixa.scoreMinimo}::int, ${faixa.scoreMaximo}::int)`,
      ),
    );
    const resultado = await sql`
      UPDATE score_rotulo sr
      SET rotulo = v.rotulo, descricao = v.descricao, score_minimo = v.minimo, score_maximo = v.maximo
      FROM (VALUES ${valores}) AS v(id, rotulo, descricao, minimo, maximo)
      WHERE sr.id_rotulo = v.id`.execute(db);
    conferirLinhas(Number(resultado.numAffectedRows ?? 0), dto.faixas.length);
    try {
      await sql`SET CONSTRAINTS ALL IMMEDIATE`.execute(db);
    } catch (erro) {
      if (temCodigoPostgres(erro, CODIGO_PG_EXCLUSAO)) {
        throw new BadRequestException(
          'Duas faixas se sobrepõem. Cada ponto de 0 a 100 fica em uma faixa só.',
        );
      }
      throw erro;
    }
    return this.findAll.executar();
  }
}
