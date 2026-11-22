import type { RecompensaEntity } from '../../../commons/database/db.types';
import { RecompensaResponse } from '../response/recompensa.response';

export class RecompensaConverter {
  static paraResponseDto(entity: RecompensaEntity): RecompensaResponse {
    return {
      idRecompensa: entity.id_recompensa,
      idCampanha: entity.id_campanha,
      descricao: entity.descricao,
      valorMinimo: Number(entity.valor_minimo),
      ativo: entity.ativo,
      criadoEm: entity.criado_em,
    };
  }
}
