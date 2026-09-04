import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import {
  ResultadoPaginado,
  paginar,
} from '../../commons/database/paginacao.util';
import { AreaConhecimentoConverter } from '../dto/converter/area-conhecimento.converter';
import { AreaConhecimentoRequestList } from '../dto/request/area-conhecimento.request-list';
import { AreaConhecimentoResponse } from '../dto/response/area-conhecimento.response';

@Injectable()
export class AreaConhecimentoServiceFindAll {
  constructor(private readonly database: DatabaseService) {}

  async executar(
    filtro: AreaConhecimentoRequestList = {},
  ): Promise<ResultadoPaginado<AreaConhecimentoResponse>> {
    // pol_area_select (04_rls_policies.sql [04-C-2]) é USING(true) - catálogo
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
      // ERA orderBy('area.codigo_cnpq') - trocado (22-08-2026, pedido do
      // Lucas: catálogos ordenam por ID, sempre). O seed já insere as 9
      // grandes áreas primeiro (1.00-9.00, viram id 1-9) e depois cada
      // leva de filhas logo após a grande área correspondente, então
      // ordenar por id continua "parecido" com ordenar por código - só
      // que agora TODAS as 9 grandes áreas aparecem primeiro (id 1-9),
      // e só depois vêm todas as filhas, agrupadas por leva de inserção
      // (as 8 filhas de área 1, depois as 13 de área 2, etc.) - não
      // interlaça grande-área/filha/filha/próxima-grande-área como
      // ordenar por código fazia. Quem quer só as filhas de uma área
      // usa o filtro `idPai` (já existe, filtrosFacetados no front).
      .orderBy('area.id_area_conhecimento');

    // `raiz=true` sobrepõe `idPai` - ver comentário no DTO de filtro.
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
