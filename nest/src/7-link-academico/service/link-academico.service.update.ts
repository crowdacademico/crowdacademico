import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { LINK_ACADEMICO_COLUNAS_SELECT } from '../constants/link-academico.constants';
import { LinkAcademicoConverter } from '../dto/converter/link-academico.converter';
import { LinkAcademicoRequestUpdate } from '../dto/request/link-academico.request-update';
import { LinkAcademicoResponse } from '../dto/response/link-academico.response';

@Injectable()
export class LinkAcademicoServiceUpdate {
  constructor(private readonly database: DatabaseService) {}

  async executar(
    id: number,
    dto: LinkAcademicoRequestUpdate,
  ): Promise<LinkAcademicoResponse> {
    const linha = await this.database
      .getDb()
      .updateTable('link_academico')
      .set({
        url: dto.url,
        rotulo: dto.rotulo ?? null,
        ordem: dto.ordem ?? null,
      })
      .where('id_link_academico', '=', id)
      .returning(LINK_ACADEMICO_COLUNAS_SELECT)
      .executeTakeFirst();

    if (!linha) {
      // pol_link_update (04): dono OU link_academico_gerenciar. 0 linhas sem
      // erro é a RLS filtrando — diferencia de "não existe", mesmo padrão de
      // papel.service.update.ts.
      const existe = await this.database
        .getDb()
        .selectFrom('link_academico')
        .select('id_link_academico')
        .where('id_link_academico', '=', id)
        .executeTakeFirst();
      if (!existe) {
        throw new NotFoundException('Link acadêmico não encontrado.');
      }
      throw new ForbiddenException('Sem permissão para editar este link.');
    }

    return LinkAcademicoConverter.paraResponseDto(linha);
  }
}
