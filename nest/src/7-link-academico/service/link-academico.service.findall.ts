import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { LINK_ACADEMICO_COLUNAS_SELECT } from '../constants/link-academico.constants';
import { LinkAcademicoConverter } from '../dto/converter/link-academico.converter';
import { LinkAcademicoResponse } from '../dto/response/link-academico.response';

// pol_link_select (04) é pública (usuario_visivel) - lista os links de
// QUALQUER pesquisador, não só os do próprio usuário (é o que aparece no
// perfil público). idUsuarioAlvo vem da rota (GET /link-academico?idUsuario=),
// nunca de request.user aqui.
@Injectable()
export class LinkAcademicoServiceFindAll {
  constructor(private readonly database: DatabaseService) {}

  async executar(idUsuarioAlvo: number): Promise<LinkAcademicoResponse[]> {
    const linhas = await this.database
      .getDb()
      .selectFrom('link_academico')
      .select(LINK_ACADEMICO_COLUNAS_SELECT)
      .where('id_usuario', '=', idUsuarioAlvo)
      .orderBy('ordem', 'asc')
      .execute();

    return linhas.map((linha) => LinkAcademicoConverter.paraResponseDto(linha));
  }
}
