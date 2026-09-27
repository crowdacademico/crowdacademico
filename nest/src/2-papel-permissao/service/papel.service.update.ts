import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { distinguir404ou403 } from '../../commons/database/distinguir-404-ou-403.util';
import { DatabaseService } from '../../commons/database/database.service';
import { CODIGO_PG_RLS_VIOLATION } from '../../commons/database/postgres-exception.filter';
import { PapelRequestUpdate } from '../dto/request/papel.request-update';
import { PapelResponse } from '../dto/response/papel.response';
import { temCodigoPostgres } from '../../commons/database/codigo-postgres.util';

@Injectable()
export class PapelServiceUpdate {
  constructor(private readonly database: DatabaseService) {}

  // Só `nome` é atualizável (GRANT UPDATE (nome) ON papel - 06_grants.sql
  // [06-B] - a coluna `codigo`, que as triggers de RBAC leem, não tem
  // GRANT nenhum: nem chega a ser possível tentar mudá-la por aqui, o DTO
  // nem tem esse campo).
  async executar(
    idPapel: number,
    dto: PapelRequestUpdate,
  ): Promise<PapelResponse> {
    try {
      const linha = await this.database
        .getDb()
        .updateTable('papel')
        .set({ nome: dto.nome })
        .where('id_papel', '=', idPapel)
        .returningAll()
        .executeTakeFirst();

      if (!linha) {
        // pol_papel_update (04): exige tem_permissao('papel_gerenciar'). 0
        // linhas afetadas sem erro é a RLS filtrando - diferencia de "não
        // existe" (só há uma condição no WHERE, o id).
        return await distinguir404ou403(
          this.database.getDb(),
          'papel',
          { id_papel: idPapel },
          `Papel ${idPapel} não encontrado.`,
          "Sem permissão 'papel_gerenciar' para renomear papéis.",
        );
      }

      return { idPapel: linha.id_papel, nome: linha.nome };
    } catch (erro) {
      if (
        erro instanceof NotFoundException ||
        erro instanceof ForbiddenException
      ) {
        throw erro;
      }
      // Nome duplicado segue para o filtro global (mensagens-duplicidade.constants.ts).
      if (temCodigoPostgres(erro, CODIGO_PG_RLS_VIOLATION)) {
        throw new ForbiddenException(
          "Sem permissão 'papel_gerenciar' para renomear papéis.",
        );
      }
      throw erro;
    }
  }
}
