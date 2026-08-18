import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import {
  ResultadoPaginado,
  paginar,
} from '../../commons/database/paginacao.util';
import { MotivoDenunciaConverter } from '../dto/converter/motivo-denuncia.converter';
import { ListarMotivoDenunciaQueryDto } from '../dto/request/listar-motivo-denuncia.query.dto';
import { MotivoDenunciaResponseDto } from '../dto/response/motivo-denuncia.response.dto';

@Injectable()
export class MotivoDenunciaServiceFindAll {
  constructor(private readonly database: DatabaseService) {}

  async executar(
    filtro: ListarMotivoDenunciaQueryDto = {},
  ): Promise<ResultadoPaginado<MotivoDenunciaResponseDto>> {
    // pol_motivo_select (04_rls_policies.sql [04-C-3]) é USING(true) —
    // catálogo público, lista mesmo sem login.
    let query = this.database
      .getDb()
      .selectFrom('motivo_denuncia')
      .selectAll()
      .orderBy('codigo');

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
