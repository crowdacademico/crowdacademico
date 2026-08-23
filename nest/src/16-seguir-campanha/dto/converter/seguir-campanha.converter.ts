import { SeguirCampanhaEntity } from '../../entity/seguir-campanha.entity';
import { SeguirCampanhaResponse } from '../response/seguir-campanha.response';

export class SeguirCampanhaConverter {
  static paraResponseDto(entity: SeguirCampanhaEntity): SeguirCampanhaResponse {
    return {
      idSegCampanha: entity.id_seg_campanha,
      idUsuario: entity.id_usuario,
      idCampanha: entity.id_campanha,
      seguidoEm: entity.seguido_em,
    };
  }
}
