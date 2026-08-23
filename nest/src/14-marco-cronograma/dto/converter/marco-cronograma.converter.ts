import { MarcoCronogramaEntity } from '../../entity/marco-cronograma.entity';
import { MarcoCronogramaResponse } from '../response/marco-cronograma.response';

export class MarcoCronogramaConverter {
  static paraResponseDto(
    entity: MarcoCronogramaEntity,
  ): MarcoCronogramaResponse {
    return {
      idMarco: entity.id_marco,
      idCampanha: entity.id_campanha,
      titulo: entity.titulo,
      descricao: entity.descricao,
      dataPrevista: entity.data_prevista,
      ordem: entity.ordem,
      criadoEm: entity.criado_em,
    };
  }
}
