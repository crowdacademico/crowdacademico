import { Injectable } from '@nestjs/common';
import { distinguir404ou403 } from '../../commons/database/distinguir-404-ou-403.util';
import { DatabaseService } from '../../commons/database/database.service';
import { LINK_ATUALIZACAO_COLUNAS_SELECT } from '../constants/link-atualizacao.constants';
import { LinkAtualizacaoConverter } from '../dto/converter/link-atualizacao.converter';
import { LinkAtualizacaoRequestUpdate } from '../dto/request/link-atualizacao.request-update';
import { LinkAtualizacaoResponse } from '../dto/response/link-atualizacao.response';

@Injectable()
export class LinkAtualizacaoServiceUpdate {
  constructor(private readonly database: DatabaseService) {}

  async executar(
    id: number,
    dto: LinkAtualizacaoRequestUpdate,
  ): Promise<LinkAtualizacaoResponse> {
    const linha = await this.database
      .getDb()
      .updateTable('link_atualizacao')
      .set({
        url: dto.url,
        ordem: dto.ordem ?? null,
      })
      .where('id_link_atualizacao', '=', id)
      .returning(LINK_ATUALIZACAO_COLUNAS_SELECT)
      .executeTakeFirst();

    if (!linha) {
      return await distinguir404ou403(
        this.database.getDb(),
        'link_atualizacao',
        'id_link_atualizacao',
        id,
        'Link de atualização não encontrado.',
        'Sem permissão para editar este link.',
      );
    }

    return LinkAtualizacaoConverter.paraResponseDto(linha);
  }
}
