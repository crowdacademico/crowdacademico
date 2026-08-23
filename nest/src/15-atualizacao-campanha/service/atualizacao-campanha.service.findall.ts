import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import {
  ResultadoPaginado,
  paginar,
} from '../../commons/database/paginacao.util';
import { ATUALIZACAO_CAMPANHA_COLUNAS_SELECT } from '../constants/atualizacao-campanha.constants';
import { AtualizacaoCampanhaConverter } from '../dto/converter/atualizacao-campanha.converter';
import { AtualizacaoCampanhaRequestList } from '../dto/request/atualizacao-campanha.request-list';
import { AtualizacaoCampanhaResponse } from '../dto/response/atualizacao-campanha.response';

// pol_atualizacao_select (04) já filtra ativo=FALSE fora do alcance de
// quem não é dono/moderador — sem checagem extra aqui.
@Injectable()
export class AtualizacaoCampanhaServiceFindAll {
  constructor(private readonly database: DatabaseService) {}

  async executar(
    filtro: AtualizacaoCampanhaRequestList,
  ): Promise<ResultadoPaginado<AtualizacaoCampanhaResponse>> {
    const query = this.database
      .getDb()
      .selectFrom('atualizacao_campanha')
      .select(ATUALIZACAO_CAMPANHA_COLUNAS_SELECT)
      .where('id_campanha', '=', filtro.idCampanha)
      .orderBy('publicado_em', 'desc');

    const resultado = await paginar(query, {
      pagina: filtro.pagina,
      tamanho: filtro.tamanho,
    });

    return {
      ...resultado,
      dados: resultado.dados.map((linha) =>
        AtualizacaoCampanhaConverter.paraResponseDto(linha),
      ),
    };
  }
}
