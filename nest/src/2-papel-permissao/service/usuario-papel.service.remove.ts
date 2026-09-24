import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { distinguir404ou403 } from '../../commons/database/distinguir-404-ou-403.util';

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

    // `resultado` nunca é undefined - mesmo motivo de
    // motivo-denuncia.service.remove.ts (executeTakeFirst() de DELETE
    // sempre resolve pro DeleteResult sintetizado pelo Kysely).
    if (resultado.numDeletedRows === 0n) {
      await distinguir404ou403(
        db,
        'usuario_papel',
        { id_usuario: idUsuario, id_papel: idPapel },
        'Este usuário não tem este papel.',
        "Sem permissão 'papel_gerenciar' para remover papéis de outros usuários.",
      );
    }
  }
}
