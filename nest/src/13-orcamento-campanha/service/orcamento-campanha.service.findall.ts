import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { ORCAMENTO_CAMPANHA_COLUNAS_SELECT } from '../constants/orcamento-campanha.constants';
import { OrcamentoCampanhaConverter } from '../dto/converter/orcamento-campanha.converter';
import { OrcamentoCampanhaResponse } from '../dto/response/orcamento-campanha.response';

@Injectable()
export class OrcamentoCampanhaServiceFindAll {
  constructor(private readonly database: DatabaseService) {}

  async executar(idCampanha: number): Promise<OrcamentoCampanhaResponse[]> {
    const linhas = await this.database
      .getDb()
      .selectFrom('orcamento_campanha')
      .select(ORCAMENTO_CAMPANHA_COLUNAS_SELECT)
      .where('id_campanha', '=', idCampanha)
      .orderBy('ordem', 'asc')
      .execute();

    return linhas.map((linha) =>
      OrcamentoCampanhaConverter.paraResponseDto(linha),
    );
  }
}
