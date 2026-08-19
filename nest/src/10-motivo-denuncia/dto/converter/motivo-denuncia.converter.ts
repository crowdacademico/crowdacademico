import { Selectable } from 'kysely';
import { MotivoDenunciaTable } from '../../../commons/database/db.types';
import { MotivoDenunciaResponse } from '../response/motivo-denuncia.response';

export class MotivoDenunciaConverter {
  static paraResponseDto(
    linha: Selectable<MotivoDenunciaTable>,
  ): MotivoDenunciaResponse {
    return {
      idMotivo: linha.id_motivo,
      descricao: linha.descricao,
      tipo: linha.tipo,
      ativo: linha.ativo,
    };
  }
}
