import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';

@Injectable()
export class UsuarioPapelServiceRemove {
  constructor(private readonly database: DatabaseService) {}

  async executar(idUsuario: number, idPapel: number): Promise<void> {
    // pol_usuariopapel_delete (04) exige tem_permissao('papel_gerenciar').
    // Sem a permissão, RLS filtra a linha antes do DELETE - 0 linhas
    // afetadas, sem erro do Postgres. Diferencia de "não existe esse vínculo"
    // checando a existência com o mesmo Kysely (mesma sessão/transação).
    const db = this.database.getDb();
    const resultado = await db
      .deleteFrom('usuario_papel')
      .where('id_usuario', '=', idUsuario)
      .where('id_papel', '=', idPapel)
      .executeTakeFirst();

    if ((resultado?.numDeletedRows ?? 0n) === 0n) {
      const existe = await db
        .selectFrom('usuario_papel')
        .select('id_usuario')
        .where('id_usuario', '=', idUsuario)
        .where('id_papel', '=', idPapel)
        .executeTakeFirst();
      if (!existe) {
        throw new NotFoundException('Este usuário não tem este papel.');
      }
      throw new ForbiddenException(
        "Sem permissão 'papel_gerenciar' para remover papéis de outros usuários.",
      );
    }
  }
}
