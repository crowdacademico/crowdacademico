import { Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseService } from '../../commons/database/database.service';
import { COMENTARIO_COLUNAS_SELECT } from '../constants/comentario.constants';
import { ComentarioConverter } from '../dto/converter/comentario.converter';
import { ComentarioRequestCreate } from '../dto/request/comentario.request-create';
import { ComentarioResponse } from '../dto/response/comentario.response';

// comentar_campanha_para_outro() (03): confere a permissão e se o autor é pesquisador ativo; as outras regras do
// comentário são triggers e valem igual ao POST /comentario.
@Injectable()
export class ComentarioServiceCreateForOther {
  constructor(private readonly database: DatabaseService) {}

  async executar(
    idPesquisador: number,
    dto: ComentarioRequestCreate,
  ): Promise<ComentarioResponse> {
    const db = this.database.getDb();
    const resultado = await sql<{ comentar_campanha_para_outro: number }>`
      SELECT public.comentar_campanha_para_outro(${idPesquisador}, ${dto.idCampanha}, ${dto.conteudo})
    `.execute(db);
    const linha = await db
      .selectFrom('comentario')
      .select(COMENTARIO_COLUNAS_SELECT)
      .where(
        'id_comentario',
        '=',
        resultado.rows[0].comentar_campanha_para_outro,
      )
      .executeTakeFirstOrThrow();
    return ComentarioConverter.paraResponseDto(linha);
  }
}
