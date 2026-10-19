import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { SEGUIR_CAMPANHA_COLUNAS_SELECT } from '../constants/seguir-campanha.constants';
import { SeguirCampanhaConverter } from '../dto/converter/seguir-campanha.converter';
import { SeguirCampanhaRequestCreate } from '../dto/request/seguir-campanha.request-create';
import { SeguirCampanhaResponse } from '../dto/response/seguir-campanha.response';

// UK_SEGUIR_CAMPANHA_USUARIO_CAMPANHA (01) barra seguir 2x - 23505,
// traduzido pelo PostgresExceptionFilter global, não checado aqui.
@Injectable()
export class SeguirCampanhaServiceCreate {
  constructor(private readonly database: DatabaseService) {}

  async executar(
    dto: SeguirCampanhaRequestCreate,
    idUsuario: number,
  ): Promise<SeguirCampanhaResponse> {
    const linha = await this.database
      .getDb()
      .insertInto('seguir_campanha')
      .values({
        id_usuario: idUsuario,
        id_campanha: dto.idCampanha,
      })
      .returning(SEGUIR_CAMPANHA_COLUNAS_SELECT)
      .executeTakeFirstOrThrow();

    return SeguirCampanhaConverter.paraResponseDto(linha);
  }
}
