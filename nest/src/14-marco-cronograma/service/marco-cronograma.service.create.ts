import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { MARCO_CRONOGRAMA_COLUNAS_SELECT } from '../constants/marco-cronograma.constants';
import { MarcoCronogramaConverter } from '../dto/converter/marco-cronograma.converter';
import { MarcoCronogramaRequestCreate } from '../dto/request/marco-cronograma.request-create';
import { MarcoCronogramaResponse } from '../dto/response/marco-cronograma.response';

@Injectable()
export class MarcoCronogramaServiceCreate {
  constructor(private readonly database: DatabaseService) {}

  async executar(
    dto: MarcoCronogramaRequestCreate,
  ): Promise<MarcoCronogramaResponse> {
    const linha = await this.database
      .getDb()
      .insertInto('marco_cronograma')
      .values({
        id_campanha: dto.idCampanha,
        titulo: dto.titulo,
        descricao: dto.descricao ?? null,
        data_prevista: new Date(dto.dataPrevista),
        ...(dto.ordem !== undefined ? { ordem: dto.ordem } : {}),
      })
      .returning(MARCO_CRONOGRAMA_COLUNAS_SELECT)
      .executeTakeFirstOrThrow();

    return MarcoCronogramaConverter.paraResponseDto(linha);
  }
}
