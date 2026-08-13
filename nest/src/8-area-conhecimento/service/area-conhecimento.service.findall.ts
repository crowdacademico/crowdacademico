import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import {
  ResultadoPaginado,
  paginar,
} from '../../commons/database/paginacao.util';
import { AreaConhecimentoConverter } from '../dto/converter/area-conhecimento.converter';
import { ListarAreaConhecimentoQueryDto } from '../dto/request/listar-area-conhecimento.query.dto';
import { AreaConhecimentoResponseDto } from '../dto/response/area-conhecimento.response.dto';

@Injectable()
export class AreaConhecimentoServiceFindAll {
  constructor(private readonly database: DatabaseService) {}

  async executar(
    filtro: ListarAreaConhecimentoQueryDto = {},
  ): Promise<ResultadoPaginado<AreaConhecimentoResponseDto>> {
    // pol_area_select (04_rls_policies.sql [04-C-2]) é USING(true) — catálogo
    // público, lista mesmo sem login (mesmo padrão de
    // ConfiguracaoControllerFindAll/PapelControllerFindAll).
    let query = this.database
      .getDb()
      .selectFrom('area_conhecimento as area')
      .leftJoin(
        'area_conhecimento as pai',
        'pai.id_area_conhecimento',
        'area.id_pai',
      )
      .select([
        'area.id_area_conhecimento',
        'area.codigo_cnpq',
        'area.nome',
        'area.id_pai',
        'area.ativo',
        'pai.nome as nome_pai',
      ])
      .orderBy('area.codigo_cnpq');

    // `raiz=true` sobrepõe `idPai` — ver comentário no DTO de filtro.
    if (filtro.raiz) {
      query = query.where('area.id_pai', 'is', null);
    } else if (filtro.idPai !== undefined) {
      query = query.where('area.id_pai', '=', filtro.idPai);
    }

    if (filtro.ativo !== undefined) {
      query = query.where('area.ativo', '=', filtro.ativo);
    }

    const resultado = await paginar(query, {
      pagina: filtro.pagina,
      tamanho: filtro.tamanho,
    });

    return {
      ...resultado,
      dados: resultado.dados.map((linha) =>
        AreaConhecimentoConverter.paraResponseDto(linha),
      ),
    };
  }
}
