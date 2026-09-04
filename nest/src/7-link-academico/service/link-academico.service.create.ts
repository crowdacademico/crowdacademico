import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { LINK_ACADEMICO_COLUNAS_SELECT } from '../constants/link-academico.constants';
import { LinkAcademicoConverter } from '../dto/converter/link-academico.converter';
import { LinkAcademicoRequestCreate } from '../dto/request/link-academico.request-create';
import { LinkAcademicoResponse } from '../dto/response/link-academico.response';

// Nenhuma validação de negócio duplicada aqui de propósito - tudo já é
// trigger no banco (05_regras_negocio.sql, [05-K-1]):
// trg_link_academico_valida_tipo barra id_tipolink sem permite_perfil=TRUE
// (ERRCODE 90002), fn_valida_limite_link_academico barra passar de
// configuracoes.limite_links_academicos_perfil (90xxx também). O
// PostgresExceptionFilter global já traduz os dois pra 400 com a mensagem
// original da função - duplicar a checagem aqui só arriscaria as duas
// regras divergirem com o tempo.
@Injectable()
export class LinkAcademicoServiceCreate {
  constructor(private readonly database: DatabaseService) {}

  async executar(
    dto: LinkAcademicoRequestCreate,
    idUsuario: number,
  ): Promise<LinkAcademicoResponse> {
    const linha = await this.database
      .getDb()
      .insertInto('link_academico')
      .values({
        id_usuario: idUsuario,
        id_tipolink: dto.idTipoLink,
        url: dto.url,
        rotulo: dto.rotulo ?? null,
        ordem: dto.ordem ?? null,
      })
      .returning(LINK_ACADEMICO_COLUNAS_SELECT)
      .executeTakeFirstOrThrow();

    return LinkAcademicoConverter.paraResponseDto(linha);
  }
}
