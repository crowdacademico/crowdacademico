import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { ScoreConfigConverter } from '../dto/converter/score-config.converter';
import { ScoreConfigResponse } from '../dto/response/score-config.response';

// Pesos do score (dimensões e subitens) e as faixas ativas de reputação, para a tela do score.
@Injectable()
export class ScoreConfigServiceFindAll {
  constructor(private readonly database: DatabaseService) {}

  async executar(): Promise<ScoreConfigResponse> {
    const db = this.database.getDb();
    const itens = await db
      .selectFrom('score_config')
      .select([
        'id_score_config',
        'nome',
        'descricao',
        'peso',
        'ativo',
        'id_pai',
      ])
      .orderBy('id_score_config')
      .execute();
    const faixas = await db
      .selectFrom('score_rotulo')
      .select([
        'id_rotulo',
        'rotulo',
        'descricao',
        'score_minimo',
        'score_maximo',
      ])
      .where('ativo', '=', true)
      .orderBy('score_minimo')
      .execute();
    return ScoreConfigConverter.paraResponseDto(itens, faixas);
  }
}
