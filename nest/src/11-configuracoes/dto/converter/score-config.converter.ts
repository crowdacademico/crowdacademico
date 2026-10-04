import type { Selectable } from 'kysely';
import type {
  ScoreConfigTable,
  ScoreRotuloTable,
} from '../../../commons/database/db.types';
import {
  ScoreConfigResponse,
  ScoreItemResponse,
} from '../response/score-config.response';

type LinhaItem = Pick<
  Selectable<ScoreConfigTable>,
  'id_score_config' | 'nome' | 'descricao' | 'peso' | 'ativo' | 'id_pai'
>;
type LinhaFaixa = Pick<
  Selectable<ScoreRotuloTable>,
  'id_rotulo' | 'rotulo' | 'descricao' | 'score_minimo' | 'score_maximo'
>;

export class ScoreConfigConverter {
  static paraResponseDto(
    itens: LinhaItem[],
    faixas: LinhaFaixa[],
  ): ScoreConfigResponse {
    const item = (linha: LinhaItem): ScoreItemResponse => ({
      idScoreConfig: linha.id_score_config,
      nome: linha.nome,
      descricao: linha.descricao,
      peso: Number(linha.peso),
      ativo: linha.ativo,
    });
    return {
      dimensoes: itens
        .filter((linha) => linha.id_pai === null)
        .map((raiz) => ({
          ...item(raiz),
          subitens: itens
            .filter((linha) => linha.id_pai === raiz.id_score_config)
            .map(item),
        })),
      faixas: faixas.map((faixa) => ({
        idRotulo: faixa.id_rotulo,
        rotulo: faixa.rotulo,
        descricao: faixa.descricao,
        scoreMinimo: faixa.score_minimo,
        scoreMaximo: faixa.score_maximo,
      })),
    };
  }
}
