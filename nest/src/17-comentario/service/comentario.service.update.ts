import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
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

    // Precisa de id_campanha ANTES do update só quando endossado=true
    // (pra calcular o próximo ordem_endosso livre daquela campanha) —
    // essa leitura já serve de "existe?" pro 404 mais abaixo também.
    const atual = await db
      .selectFrom('comentario')
      .select(['id_campanha'])
      .where('id_comentario', '=', id)
      .executeTakeFirst();

    if (!atual) {
      throw new NotFoundException('Comentário não encontrado.');
    }

    let ordemEndosso: number | null | undefined;
    if (dto.endossado === true) {
      const resultado = await db
        .selectFrom('comentario')
        .select((eb) => eb.fn.max('ordem_endosso').as('maximo'))
        .where('id_campanha', '=', atual.id_campanha)
        .where('ativo', '=', true)
        .where('id_comentario', '<>', id)
        .executeTakeFirst();
      ordemEndosso = (resultado?.maximo ?? 0) + 1;
    } else if (dto.endossado === false) {
      ordemEndosso = null;
    }

    const linha = await db
      .updateTable('comentario')
      .set({
        ...(dto.conteudo !== undefined ? { conteudo: dto.conteudo } : {}),
        ...(dto.endossado !== undefined
          ? { endossado: dto.endossado, ordem_endosso: ordemEndosso }
          : {}),
        ...(dto.ativo !== undefined ? { ativo: dto.ativo } : {}),
      })
      .where('id_comentario', '=', id)
      .returning(COMENTARIO_COLUNAS_SELECT)
      .executeTakeFirst();

    if (!linha) {
      // pol_comentario_update (04): autor OU comentario_moderar OU dono da
      // campanha. A leitura acima já confirmou que a linha EXISTE — chegar
      // aqui sem resultado só pode ser a RLS bloqueando o UPDATE.
      throw new ForbiddenException(
        'Sem permissão para editar este comentário.',
      );
    }

    return ComentarioConverter.paraResponseDto(linha);
  }
}
