import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
      const existe = await this.database
        .getDb()
        .selectFrom('link_atualizacao')
        .select('id_link_atualizacao')
        .where('id_link_atualizacao', '=', id)
        .executeTakeFirst();
      if (!existe) {
        throw new NotFoundException('Link de atualização não encontrado.');
      }
      throw new ForbiddenException('Sem permissão para editar este link.');
    }

    return LinkAtualizacaoConverter.paraResponseDto(linha);
  }
}
