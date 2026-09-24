import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { distinguir404ou403 } from '../../commons/database/distinguir-404-ou-403.util';

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

    // `resultado` nunca é undefined - mesmo motivo de
    // motivo-denuncia.service.remove.ts (executeTakeFirst() de DELETE
    // sempre resolve pro DeleteResult sintetizado pelo Kysely).
    if (resultado.numDeletedRows === 0n) {
      await distinguir404ou403(
        db,
        'papel_permissao',
        { id_papel: idPapel, id_permissao: idPermissao },
        'Este papel não tem esta permissão.',
        "Sem permissão 'papel_gerenciar' para revogar permissões.",
      );
    }
  }
}
