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
    // ERA orderBy('criado_em', 'desc') — trocado (23-08-2026, pedido do
    // Lucas: "ordene por ID", mesmo padrão já aplicado em motivo_
    // denuncia/tipo_link/area_conhecimento — catálogo ordena por ID,
    // sempre). `criado_em` do seed nem sempre bate com a ordem de
    // inserção real (algumas linhas foram seedadas com timestamp
    // retroativo), então a ordem por data ficava embaralhada em relação
    // ao id — por ID é estável e previsível.
    let query = this.database
      .getDb()
      .selectFrom('campanha')
      .select(CAMPANHA_COLUNAS_SELECT)
      .orderBy('id_campanha');

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
