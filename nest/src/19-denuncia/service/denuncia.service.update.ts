import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { distinguir404ou403 } from '../../commons/database/distinguir-404-ou-403.util';
import { DenunciaConverter } from '../dto/converter/denuncia.converter';
import { DenunciaRequestUpdate } from '../dto/request/denuncia.request-update';
import { DenunciaResponse } from '../dto/response/denuncia.response';
import { consultaDenunciaComDetalhes } from './denuncia.util.with-details';

// Julgar (RF-111): muda o status e grava a justificativa (só ao decidir; em pendente e em análise ela fica vazia).
// Quem denunciou não julga (92006) e o log de auditoria registra quem decidiu (05).
@Injectable()
export class DenunciaServiceUpdate {
  constructor(private readonly database: DatabaseService) {}

  async executar(
    id: number,
    dto: DenunciaRequestUpdate,
  ): Promise<DenunciaResponse> {
    const db = this.database.getDb();
    const decidida =
      dto.status === 'resolvida' || dto.status === 'improcedente';
    const linha = await db
      .updateTable('denuncia')
      .set({
        status: dto.status,
        justificativa_moderacao: decidida
          ? (dto.justificativa?.trim() ?? null)
          : null,
      })
      .where('id_denuncia', '=', id)
      .returning('id_denuncia')
      .executeTakeFirst();

    if (!linha) {
      return distinguir404ou403(
        db,
        'denuncia',
        { id_denuncia: id },
        'Denúncia não encontrada.',
        'Sem permissão para julgar denúncias.',
      );
    }

    const atualizada = await consultaDenunciaComDetalhes(db)
      .where('denuncia.id_denuncia', '=', id)
      .executeTakeFirstOrThrow();
    return DenunciaConverter.paraResponseDto(atualizada);
  }
}
