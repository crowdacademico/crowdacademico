import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import {
  ResultadoPaginado,
  paginar,
} from '../../commons/database/paginacao.util';
import { TipoLinkConverter } from '../dto/converter/tipo-link.converter';
import { TipoLinkRequestList } from '../dto/request/tipo-link.request-list';
import { TipoLinkResponse } from '../dto/response/tipo-link.response';

@Injectable()
export class TipoLinkServiceFindAll {
  constructor(private readonly database: DatabaseService) {}

  async executar(
    filtro: TipoLinkRequestList = {},
  ): Promise<ResultadoPaginado<TipoLinkResponse>> {
    // pol_tipolink_select (04_rls_policies.sql [04-C-2]) é USING(true) -
    // catálogo público, lista mesmo sem login.
    let query = this.database
      .getDb()
      .selectFrom('tipo_link')
      .selectAll()
      // ERA orderBy('nome') - trocado (22-08-2026, pedido do Lucas:
      // catálogos ordenam por ID, sempre). O seed já insere na ordem
      // Lattes/ORCID/ResearchGate/LinkedIn/GitHub, então o resultado
      // visual nem muda muito, só passa a ser estável por id em vez de
      // recalculado por nome toda vez.
      .orderBy('id_tipolink');

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
