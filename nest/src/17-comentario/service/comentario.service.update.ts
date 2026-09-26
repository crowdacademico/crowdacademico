import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { distinguir404ou403 } from '../../commons/database/distinguir-404-ou-403.util';
import { COMENTARIO_COLUNAS_SELECT } from '../constants/comentario.constants';
import { ComentarioConverter } from '../dto/converter/comentario.converter';
import { ComentarioRequestUpdate } from '../dto/request/comentario.request-update';
import { ComentarioResponse } from '../dto/response/comentario.response';

@Injectable()
export class ComentarioServiceUpdate {
  constructor(private readonly database: DatabaseService) {}

  async executar(
    id: number,
    dto: ComentarioRequestUpdate,
  ): Promise<ComentarioResponse> {
    const db = this.database.getDb();

    // ordem_endosso não é enviada: a trigger validar_comentario_endosso_autor (05) calcula ao endossar e zera ao remover.
    const linha = await db
      .updateTable('comentario')
      .set({
        ...(dto.conteudo !== undefined ? { conteudo: dto.conteudo } : {}),
        ...(dto.endossado !== undefined ? { endossado: dto.endossado } : {}),
        ...(dto.ativo !== undefined ? { ativo: dto.ativo } : {}),
      })
      .where('id_comentario', '=', id)
      .returning(COMENTARIO_COLUNAS_SELECT)
      .executeTakeFirst();

    if (!linha) {
      // pol_comentario_update (04): autor OU comentario_moderar OU dono da campanha.
      return distinguir404ou403(
        db,
        'comentario',
        { id_comentario: id },
        'Comentário não encontrado.',
        'Sem permissão para editar este comentário.',
      );
    }

    return ComentarioConverter.paraResponseDto(linha);
  }
}
