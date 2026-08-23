import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { ORCAMENTO_CAMPANHA_COLUNAS_SELECT } from '../constants/orcamento-campanha.constants';
import { OrcamentoCampanhaConverter } from '../dto/converter/orcamento-campanha.converter';
import { OrcamentoCampanhaRequestCreate } from '../dto/request/orcamento-campanha.request-create';
import { OrcamentoCampanhaResponse } from '../dto/response/orcamento-campanha.response';

@Injectable()
export class OrcamentoCampanhaServiceCreate {
  constructor(private readonly database: DatabaseService) {}

  async executar(
    dto: OrcamentoCampanhaRequestCreate,
  ): Promise<OrcamentoCampanhaResponse> {
    const linha = await this.database
      .getDb()
      .insertInto('orcamento_campanha')
      .values({
        id_campanha: dto.idCampanha,
        categoria: dto.categoria,
        descricao: dto.descricao ?? null,
        valor: dto.valor.toString(),
        ...(dto.ordem !== undefined ? { ordem: dto.ordem } : {}),
      })
      .returning(ORCAMENTO_CAMPANHA_COLUNAS_SELECT)
      .executeTakeFirstOrThrow();

    return OrcamentoCampanhaConverter.paraResponseDto(linha);
  }
}
