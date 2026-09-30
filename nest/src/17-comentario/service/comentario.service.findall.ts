import { Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseService } from '../../commons/database/database.service';
import {
  ResultadoPaginado,
  paginar,
} from '../../commons/database/paginacao.util';
import { COMENTARIO_COLUNAS_SELECT } from '../constants/comentario.constants';
import { ComentarioConverter } from '../dto/converter/comentario.converter';
import { PorCampanhaQueryDto } from '../../commons/database/dto/por-campanha.query.dto';
import { ComentarioResponse } from '../dto/response/comentario.response';

// pol_comentario_select (04) já esconde comentário inativo/não-endossado
// de quem não é dono/moderador. Além disso, o comentário bloqueado pelo dono
// (inativo) some da lista dele; continua visível ao autor e à moderação.
// O nome do autor vem por LEFT JOIN (RF-093), como em campanha.util.with-names.ts:
// conta excluída deixa o comentário sem nome, não o esconde.
@Injectable()
export class ComentarioServiceFindAll {
  constructor(private readonly database: DatabaseService) {}

  async executar(
    filtro: PorCampanhaQueryDto,
  ): Promise<ResultadoPaginado<ComentarioResponse>> {
    const query = this.database
      .getDb()
      .selectFrom('comentario')
      .leftJoin('usuario', 'usuario.id_usuario', 'comentario.id_pesquisador')
      .select(
        COMENTARIO_COLUNAS_SELECT.map(
          (coluna) => `comentario.${coluna}` as const,
        ),
      )
      .select('usuario.nome as nome_pesquisador')
      .where('comentario.id_campanha', '=', filtro.idCampanha)
      .where(
        sql<boolean>`(comentario.ativo OR comentario.id_pesquisador = public.id_usuario_atual() OR public.tem_permissao('comentario_moderar'))`,
      )
      .orderBy('comentario.criado_em', 'desc');

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
