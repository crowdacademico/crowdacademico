import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { LINK_ATUALIZACAO_COLUNAS_SELECT } from '../constants/link-atualizacao.constants';
import { LinkAtualizacaoConverter } from '../dto/converter/link-atualizacao.converter';
import { LinkAtualizacaoResponse } from '../dto/response/link-atualizacao.response';

@Injectable()
export class LinkAtualizacaoServiceFindAll {
  constructor(private readonly database: DatabaseService) {}

  async executar(idAtualizacao: number): Promise<LinkAtualizacaoResponse[]> {
    const linhas = await this.database
      .getDb()
      .selectFrom('link_atualizacao')
      .select(LINK_ATUALIZACAO_COLUNAS_SELECT)
      .where('id_atualizacao', '=', idAtualizacao)
      .orderBy('ordem', 'asc')
      .execute();

    return linhas.map((linha) =>
      LinkAtualizacaoConverter.paraResponseDto(linha),
    );
  }
}
