import { Injectable } from '@nestjs/common';
import { distinguir404ou403 } from '../../commons/database/distinguir-404-ou-403.util';
import { DatabaseService } from '../../commons/database/database.service';
import { RecompensaConverter } from '../dto/converter/recompensa.converter';
import { RecompensaRequestUpdate } from '../dto/request/recompensa.request-create';
import { RecompensaResponse } from '../dto/response/recompensa.response';

// Com alguém no mural, mudar o valor mínimo ou desativar é recusado pelo banco (fn_recompensa_trava, 05, 91067).
@Injectable()
export class RecompensaServiceUpdate {
  constructor(private readonly database: DatabaseService) {}

  async executar(
    idRecompensa: number,
    dto: RecompensaRequestUpdate,
  ): Promise<RecompensaResponse> {
    const linha = await this.database
      .getDb()
      .updateTable('recompensa')
      .set({
        ...(dto.descricao !== undefined && {
          descricao: dto.descricao?.trim() || null,
        }),
        ...(dto.valorMinimo !== undefined && {
          valor_minimo: dto.valorMinimo.toFixed(2),
        }),
        ...(dto.ativo !== undefined && { ativo: dto.ativo }),
      })
      .where('id_recompensa', '=', idRecompensa)
      .returningAll()
      .executeTakeFirst();

    if (!linha) {
      return await distinguir404ou403(
        this.database.getDb(),
        'recompensa',
        { id_recompensa: idRecompensa },
        'Recompensa não encontrada.',
        'Só o dono da campanha altera a recompensa dela.',
      );
    }
    return RecompensaConverter.paraResponseDto(linha);
  }
}
