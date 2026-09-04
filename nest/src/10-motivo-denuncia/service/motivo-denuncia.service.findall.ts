import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import {
  ResultadoPaginado,
  paginar,
} from '../../commons/database/paginacao.util';
import { MotivoDenunciaConverter } from '../dto/converter/motivo-denuncia.converter';
import { MotivoDenunciaRequestList } from '../dto/request/motivo-denuncia.request-list';
import { MotivoDenunciaResponse } from '../dto/response/motivo-denuncia.response';

@Injectable()
export class MotivoDenunciaServiceFindAll {
  constructor(private readonly database: DatabaseService) {}

  async executar(
    filtro: MotivoDenunciaRequestList = {},
  ): Promise<ResultadoPaginado<MotivoDenunciaResponse>> {
    // pol_motivo_select (04_rls_policies.sql [04-C-3]) é USING(true) -
    // catálogo público, lista mesmo sem login.
    // ERA orderBy('codigo') (removida, 18-08-2026), depois orderBy('descricao').
    // Trocado pra orderBy('id_motivo') (22-08-2026, pedido do Lucas:
    // catálogos ordenam por ID, sempre). O seed já insere todos os 8
    // motivos de 'campanha' primeiro e depois os 4 de 'perfil', então o
    // agrupamento por tipo continua igual, só passa a ser por id.
    let query = this.database
      .getDb()
      .selectFrom('motivo_denuncia')
      .selectAll()
      .orderBy('id_motivo');

    if (filtro.ativo !== undefined) {
      query = query.where('ativo', '=', filtro.ativo);
    }

    if (filtro.tipo !== undefined) {
      query = query.where('tipo', '=', filtro.tipo);
    }

    const resultado = await paginar(query, {
      pagina: filtro.pagina,
      tamanho: filtro.tamanho,
    });

    return {
      ...resultado,
      dados: resultado.dados.map((linha) =>
        MotivoDenunciaConverter.paraResponseDto(linha),
      ),
    };
  }
}
