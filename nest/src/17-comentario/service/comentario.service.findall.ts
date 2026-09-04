import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import {
  ResultadoPaginado,
  paginar,
} from '../../commons/database/paginacao.util';
import { COMENTARIO_COLUNAS_SELECT } from '../constants/comentario.constants';
import { ComentarioConverter } from '../dto/converter/comentario.converter';
import { ComentarioRequestList } from '../dto/request/comentario.request-list';
import { ComentarioResponse } from '../dto/response/comentario.response';

// pol_comentario_select (04) já esconde comentário inativo/não-endossado
// de quem não é dono/moderador - sem checagem extra aqui.
@Injectable()
export class ComentarioServiceFindAll {
  constructor(private readonly database: DatabaseService) {}

  async executar(
    filtro: ComentarioRequestList,
  ): Promise<ResultadoPaginado<ComentarioResponse>> {
    const query = this.database
      .getDb()
      .selectFrom('comentario')
      .select(COMENTARIO_COLUNAS_SELECT)
      .where('id_campanha', '=', filtro.idCampanha)
      .orderBy('criado_em', 'desc');

    const resultado = await paginar(query, {
      pagina: filtro.pagina,
      tamanho: filtro.tamanho,
    });

    return {
      ...resultado,
      dados: resultado.dados.map((linha) =>
        ComentarioConverter.paraResponseDto(linha),
      ),
    };
  }
}
