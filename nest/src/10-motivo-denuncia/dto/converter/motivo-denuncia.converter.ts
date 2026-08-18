import { Selectable } from 'kysely';
import { MotivoDenunciaTable } from '../../../commons/database/db.types';
import { MotivoDenunciaResponseDto } from '../response/motivo-denuncia.response.dto';

export class MotivoDenunciaConverter {
  static paraResponseDto(
    linha: Selectable<MotivoDenunciaTable>,
  ): MotivoDenunciaResponseDto {
    return {
      idMotivo: linha.id_motivo,
      codigo: linha.codigo,
      descricao: linha.descricao,
      tipo: linha.tipo,
      ativo: linha.ativo,
    };
  }
}
