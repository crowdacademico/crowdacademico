import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import {
  ResultadoPaginado,
  paginar,
} from '../../commons/database/paginacao.util';
import { TipoLinkConverter } from '../dto/converter/tipo-link.converter';
import { ListarTipoLinkQueryDto } from '../dto/request/listar-tipo-link.query.dto';
import { TipoLinkResponseDto } from '../dto/response/tipo-link.response.dto';

@Injectable()
export class TipoLinkServiceFindAll {
  constructor(private readonly database: DatabaseService) {}

  async executar(
    filtro: ListarTipoLinkQueryDto = {},
  ): Promise<ResultadoPaginado<TipoLinkResponseDto>> {
    // pol_tipolink_select (04_rls_policies.sql [04-C-2]) é USING(true) —
    // catálogo público, lista mesmo sem login.
    let query = this.database
      .getDb()
      .selectFrom('tipo_link')
      .selectAll()
      .orderBy('nome');

    if (filtro.ativo !== undefined) {
      query = query.where('ativo', '=', filtro.ativo);
    }

    if (filtro.escopo === 'perfil') {
      query = query.where('permite_perfil', '=', true);
    } else if (filtro.escopo === 'atualizacao') {
      query = query.where('permite_atualizacao', '=', true);
    } else if (filtro.escopo === 'recompensa') {
      query = query.where('permite_recompensa', '=', true);
    }

    const resultado = await paginar(query, {
      pagina: filtro.pagina,
      tamanho: filtro.tamanho,
    });

    return {
      ...resultado,
      dados: resultado.dados.map((linha) =>
        TipoLinkConverter.paraResponseDto(linha),
      ),
    };
  }
}
