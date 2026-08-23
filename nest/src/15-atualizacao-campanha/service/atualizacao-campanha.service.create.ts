import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { ATUALIZACAO_CAMPANHA_COLUNAS_SELECT } from '../constants/atualizacao-campanha.constants';
import { AtualizacaoCampanhaConverter } from '../dto/converter/atualizacao-campanha.converter';
import { AtualizacaoCampanhaRequestCreate } from '../dto/request/atualizacao-campanha.request-create';
import { AtualizacaoCampanhaResponse } from '../dto/response/atualizacao-campanha.response';

@Injectable()
export class AtualizacaoCampanhaServiceCreate {
  constructor(private readonly database: DatabaseService) {}

  async executar(
    dto: AtualizacaoCampanhaRequestCreate,
  ): Promise<AtualizacaoCampanhaResponse> {
    const linha = await this.database
      .getDb()
      .insertInto('atualizacao_campanha')
      .values({
        id_campanha: dto.idCampanha,
        titulo: dto.titulo,
        conteudo: dto.conteudo,
        fase: dto.fase ?? null,
        tipo: dto.tipo ?? null,
      })
      .returning(ATUALIZACAO_CAMPANHA_COLUNAS_SELECT)
      .executeTakeFirstOrThrow();

    return AtualizacaoCampanhaConverter.paraResponseDto(linha);
  }
}
