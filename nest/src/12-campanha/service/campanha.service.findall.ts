import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import {
  ResultadoPaginado,
  paginar,
} from '../../commons/database/paginacao.util';
import { CAMPANHA_COLUNAS_SELECT } from '../constants/campanha.constants';
import { CampanhaConverter } from '../dto/converter/campanha.converter';
import { CampanhaRequestList } from '../dto/request/campanha.request-list';
import { CampanhaResponse } from '../dto/response/campanha.response';

// pol_campanha_select (04) já decide QUAIS linhas aparecem (status
// público, ou dono, ou relatorio_visualizar) — os filtros abaixo são só
// conveniência de navegação por cima do que a RLS já deixou visível,
// nunca uma segunda camada de autorização.
@Injectable()
export class CampanhaServiceFindAll {
  constructor(private readonly database: DatabaseService) {}

  async executar(
    filtro: CampanhaRequestList = {},
  ): Promise<ResultadoPaginado<CampanhaResponse>> {
    let query = this.database
      .getDb()
      .selectFrom('campanha')
      .select(CAMPANHA_COLUNAS_SELECT)
      .orderBy('criado_em', 'desc');

    if (filtro.status !== undefined) {
      query = query.where('status', '=', filtro.status);
    }
    if (filtro.idAreaConhecimento !== undefined) {
      query = query.where(
        'id_area_conhecimento',
        '=',
        filtro.idAreaConhecimento,
      );
    }
    if (filtro.idUsuario !== undefined) {
      query = query.where('id_usuario', '=', filtro.idUsuario);
    }

    const resultado = await paginar(query, {
      pagina: filtro.pagina,
      tamanho: filtro.tamanho,
    });

    return {
      ...resultado,
      dados: resultado.dados.map((linha) =>
        CampanhaConverter.paraResponseDto(linha),
      ),
    };
  }
}
