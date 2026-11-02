import { BadRequestException, Injectable } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { distinguir404ou403 } from '../../commons/database/distinguir-404-ou-403.util';
import { DenunciaConverter } from '../dto/converter/denuncia.converter';
import { DenunciaRequestUpdate } from '../dto/request/denuncia.request-update';
import { DenunciaResponse } from '../dto/response/denuncia.response';
import { consultaDenunciaComDetalhes } from './denuncia.util.with-details';

// Julgar (RF-115): muda o status e grava a justificativa. Ao decidir (procedente ou improcedente), o porquê da decisão;
// ao reabrir uma denúncia já julgada (voltar a pendente), o porquê da reabertura, que o log de auditoria mostra junto de
// quem reabriu. Pendente que continua pendente fica sem justificativa. Quem denunciou não julga (92006, 05).
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
    const atual = await db
      .selectFrom('denuncia')
      .select('status')
      .where('id_denuncia', '=', id)
      .executeTakeFirst();
    const reabrindo =
      dto.status === 'pendente' &&
      atual !== undefined &&
      atual.status !== 'pendente';
    if (reabrindo && !dto.justificativa?.trim()) {
      throw new BadRequestException(
        'Escreva por que a denúncia está sendo reaberta.',
      );
    }
    const linha = await db
      .updateTable('denuncia')
      .set({
        status: dto.status,
        justificativa_moderacao:
          decidida || reabrindo ? (dto.justificativa?.trim() ?? null) : null,
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
