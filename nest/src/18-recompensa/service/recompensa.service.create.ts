import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { RecompensaConverter } from '../dto/converter/recompensa.converter';
import { RecompensaRequestCreate } from '../dto/request/recompensa.request-create';
import { RecompensaResponse } from '../dto/response/recompensa.response';

// Criar o Mural dos apoiadores da campanha. Só o dono (pol_recompensa_insert, 04); a segunda recompensa da mesma
// campanha cai em UK_RECOMPENSA_CAMPANHA (mensagem em mensagens-duplicidade.constants.ts).
@Injectable()
export class RecompensaServiceCreate {
  constructor(private readonly database: DatabaseService) {}

  async executar(dto: RecompensaRequestCreate): Promise<RecompensaResponse> {
    const linha = await this.database
      .getDb()
      .insertInto('recompensa')
      .values({
        id_campanha: dto.idCampanha,
        descricao: dto.descricao?.trim() || null,
        valor_minimo: dto.valorMinimo.toFixed(2),
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    return RecompensaConverter.paraResponseDto(linha);
  }
}
