import { SeguirPesquisadorEntity } from '../../../commons/database/db.types';
import { SeguirPesquisadorResponse } from '../response/seguir-pesquisador.response';

export class SeguirPesquisadorConverter {
  static paraResponseDto(
    entity: SeguirPesquisadorEntity & { nome_pesquisador?: string | null },
  ): SeguirPesquisadorResponse {
    return {
      idSegPesquisador: entity.id_seg_pesquisador,
      idUsuario: entity.id_usuario,
      idPesquisador: entity.id_pesquisador,
      nomePesquisador: entity.nome_pesquisador ?? null,
      seguidoEm: entity.seguido_em,
    };
  }
}
