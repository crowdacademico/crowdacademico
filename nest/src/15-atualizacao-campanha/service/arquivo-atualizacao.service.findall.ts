import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { ARQUIVO_ATUALIZACAO_COLUNAS_SELECT } from '../constants/arquivo-atualizacao.constants';
import { ArquivoAtualizacaoConverter } from '../dto/converter/arquivo-atualizacao.converter';
import { ArquivoAtualizacaoResponse } from '../dto/response/arquivo-atualizacao.response';

@Injectable()
export class ArquivoAtualizacaoServiceFindAll {
  constructor(private readonly database: DatabaseService) {}

  async executar(idAtualizacao: number): Promise<ArquivoAtualizacaoResponse[]> {
    const linhas = await this.database
      .getDb()
      .selectFrom('arquivo_atualizacao')
      .select(ARQUIVO_ATUALIZACAO_COLUNAS_SELECT)
      .where('id_atualizacao', '=', idAtualizacao)
      .execute();

    return linhas.map((linha) =>
      ArquivoAtualizacaoConverter.paraResponseDto(linha),
    );
  }
}
