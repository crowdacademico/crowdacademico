import { BadRequestException, Injectable } from '@nestjs/common';
import { distinguir404ou403 } from '../../commons/database/distinguir-404-ou-403.util';
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
    const campos = {
      ...(dto.url !== undefined ? { url: dto.url } : {}),
      ...(dto.rotulo !== undefined ? { rotulo: dto.rotulo } : {}),
      ...(dto.ordem !== undefined ? { ordem: dto.ordem } : {}),
    };
    if (Object.keys(campos).length === 0) {
      throw new BadRequestException('Nenhum campo para atualizar.');
    }

    const linha = await this.database
      .getDb()
      .updateTable('link_academico')
      .set(campos)
      .where('id_link_academico', '=', id)
      .returning(LINK_ACADEMICO_COLUNAS_SELECT)
      .executeTakeFirst();

    if (!linha) {
      // pol_link_update (04): dono OU link_academico_gerenciar. 0 linhas sem
      // erro é a RLS filtrando - diferencia de "não existe", mesmo padrão de
      // papel.service.update.ts.
      return await distinguir404ou403(
        this.database.getDb(),
        'link_academico',
        { id_link_academico: id },
        'Link acadêmico não encontrado.',
        'Sem permissão para editar este link.',
      );
    }

    return LinkAcademicoConverter.paraResponseDto(linha);
  }
}
