import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { PerfilPesquisadorResponseScore } from '../dto/response/perfil-pesquisador.response-score';

// Score/dimensões de um pesquisador — pol_score_select (04) é PÚBLICA de
// propósito (decisão de produto revertida em 30-07-2026, ver
// DOCUMENTACAO_BD.md/[04-I-3]: base do "Serasa do Pesquisador"), então
// nenhuma checagem de permissão aqui, diferente do CPF. score_pesquisador
// tem UMA LINHA POR DIMENSÃO (UNIQUE (id_usuario, id_score_config)) — cada
// linha carrega score_total/id_rotulo repetidos (o mesmo valor agregado
// carimbado em toda linha por recalcular_score_pesquisador(), 05), por isso
// o total/rótulo da resposta vêm de qualquer uma das linhas, não de uma
// query separada.
@Injectable()
export class PerfilPesquisadorServiceFindOneScore {
  constructor(private readonly database: DatabaseService) {}

  async executar(idUsuario: number): Promise<PerfilPesquisadorResponseScore> {
    const db = this.database.getDb();

    const linhas = await db
      .selectFrom('score_pesquisador as sp')
      .innerJoin(
        'score_config as sc',
        'sc.id_score_config',
        'sp.id_score_config',
      )
      .leftJoin('score_rotulo as sr', 'sr.id_rotulo', 'sp.id_rotulo')
      .select([
        'sp.pontos_obtidos',
        'sp.score_total',
        'sp.calculado_em',
        'sp.motivo',
        'sc.nome as nome_dimensao',
        'sc.peso',
        'sr.rotulo',
      ])
      .where('sp.id_usuario', '=', idUsuario)
      .orderBy('sc.id_score_config')
      .execute();

    if (linhas.length === 0) {
      throw new NotFoundException(
        'Nenhum dado de score encontrado para este pesquisador.',
      );
    }

    return {
      idUsuario,
      scoreTotal: linhas[0].score_total ?? 0,
      rotulo: linhas[0].rotulo,
      dimensoes: linhas.map((linha) => ({
        nomeDimensao: linha.nome_dimensao,
        pontosObtidos: linha.pontos_obtidos,
        peso: linha.peso,
        calculadoEm: linha.calculado_em,
        motivo: linha.motivo,
      })),
    };
  }
}
