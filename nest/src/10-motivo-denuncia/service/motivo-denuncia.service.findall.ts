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
    // pol_motivo_select (04_rls_policies.sql [04-C-3]) é USING(true) —
    // catálogo público, lista mesmo sem login.
    // ERA orderBy('codigo') — coluna removida (18-08-2026, ver
    // criar-motivo-denuncia.request.dto.ts). `descricao` é o único
    // identificador legível que sobrou.
    let query = this.database
      .getDb()
      .selectFrom('motivo_denuncia')
      .selectAll()
      .orderBy('descricao');

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
