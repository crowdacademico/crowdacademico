import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { MARCO_CRONOGRAMA_COLUNAS_SELECT } from '../constants/marco-cronograma.constants';
import { MarcoCronogramaConverter } from '../dto/converter/marco-cronograma.converter';
import { MarcoCronogramaResponse } from '../dto/response/marco-cronograma.response';

@Injectable()
export class MarcoCronogramaServiceFindAll {
  constructor(private readonly database: DatabaseService) {}

  async executar(idCampanha: number): Promise<MarcoCronogramaResponse[]> {
    const linhas = await this.database
      .getDb()
      .selectFrom('marco_cronograma')
      .select(MARCO_CRONOGRAMA_COLUNAS_SELECT)
      .where('id_campanha', '=', idCampanha)
      .orderBy('ordem', 'asc')
      .execute();

    return linhas.map((linha) =>
      MarcoCronogramaConverter.paraResponseDto(linha),
    );
  }
}
