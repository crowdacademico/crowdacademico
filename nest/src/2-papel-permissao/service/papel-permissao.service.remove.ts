import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';

@Injectable()
export class PapelPermissaoServiceRemove {
  constructor(private readonly database: DatabaseService) {}

  async executar(idPapel: number, idPermissao: number): Promise<void> {
    // pol_papelperm_delete (04) exige tem_permissao('papel_gerenciar'). Sem
    // a permissão, RLS filtra a linha antes do DELETE - 0 linhas afetadas,
    // sem erro do Postgres. Diferencia de "não existe esse vínculo"
    // checando a existência com o mesmo Kysely (mesma sessão/transação) -
    // mesmo padrão de usuario-papel.service.remove.ts.
    const db = this.database.getDb();
    const resultado = await db
      .deleteFrom('papel_permissao')
      .where('id_papel', '=', idPapel)
      .where('id_permissao', '=', idPermissao)
      .executeTakeFirst();

    if ((resultado?.numDeletedRows ?? 0n) === 0n) {
      const existe = await db
        .selectFrom('papel_permissao')
        .select('id_papel')
        .where('id_papel', '=', idPapel)
        .where('id_permissao', '=', idPermissao)
        .executeTakeFirst();
      if (!existe) {
        throw new NotFoundException('Este papel não tem esta permissão.');
      }
      throw new ForbiddenException(
        "Sem permissão 'papel_gerenciar' para revogar permissões.",
      );
    }
  }
}
