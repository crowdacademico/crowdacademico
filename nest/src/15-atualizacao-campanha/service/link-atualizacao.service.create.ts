import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { LINK_ATUALIZACAO_COLUNAS_SELECT } from '../constants/link-atualizacao.constants';
import { LinkAtualizacaoConverter } from '../dto/converter/link-atualizacao.converter';
import { LinkAtualizacaoRequestCreate } from '../dto/request/link-atualizacao.request-create';
import { LinkAtualizacaoResponse } from '../dto/response/link-atualizacao.response';

@Injectable()
export class LinkAtualizacaoServiceCreate {
  constructor(private readonly database: DatabaseService) {}

  async executar(
    dto: LinkAtualizacaoRequestCreate,
  ): Promise<LinkAtualizacaoResponse> {
    const linha = await this.database
      .getDb()
      .insertInto('link_atualizacao')
      .values({
        id_atualizacao: dto.idAtualizacao,
        id_tipolink: dto.idTipoLink,
        url: dto.url,
        ordem: dto.ordem ?? null,
      })
      .returning(LINK_ATUALIZACAO_COLUNAS_SELECT)
      .executeTakeFirstOrThrow();

    return LinkAtualizacaoConverter.paraResponseDto(linha);
  }
}
