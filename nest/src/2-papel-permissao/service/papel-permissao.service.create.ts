import { ForbiddenException, Injectable } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { CODIGO_PG_RLS_VIOLATION } from '../../commons/database/postgres-exception.filter';
import { PapelPermissaoRequestCreate } from '../dto/request/papel-permissao.request-create';
import { temCodigoPostgres } from '../../commons/database/codigo-postgres.util';

@Injectable()
export class PapelPermissaoServiceCreate {
  constructor(private readonly database: DatabaseService) {}

  async executar(dto: PapelPermissaoRequestCreate): Promise<void> {
    try {
      // pol_papelperm_insert (04) exige tem_permissao('papel_gerenciar').
      await this.database
        .getDb()
        .insertInto('papel_permissao')
        .values({ id_papel: dto.idPapel, id_permissao: dto.idPermissao })
        .execute();
    } catch (erro) {
      // Permissão já concedida segue para o filtro global (mensagens-duplicidade.constants.ts).
      if (temCodigoPostgres(erro, CODIGO_PG_RLS_VIOLATION)) {
        throw new ForbiddenException(
          "Sem permissão 'papel_gerenciar' para conceder permissões.",
        );
      }
      throw erro;
    }
  }
}
