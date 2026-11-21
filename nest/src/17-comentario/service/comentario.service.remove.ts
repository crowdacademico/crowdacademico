import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { distinguir404ou403 } from '../../commons/database/distinguir-404-ou-403.util';

// Apagar de vez um comentário: pol_comentario_delete (04) só deixa a moderação (21-11-2026). O dono da campanha
// exclui e bloqueia pelo PATCH (ativo e bloqueado): o comentário fica guardado. O autor não é avisado.
@Injectable()
export class ComentarioServiceRemove {
  constructor(private readonly database: DatabaseService) {}

  async executar(id: number): Promise<void> {
    const db = this.database.getDb();
    const resultado = await db
      .deleteFrom('comentario')
      .where('id_comentario', '=', id)
      .executeTakeFirst();

    if (resultado.numDeletedRows === 0n) {
      await distinguir404ou403(
        db,
        'comentario',
        { id_comentario: id },
        'Comentário não encontrado.',
        'Só a moderação apaga um comentário de vez; o dono da campanha exclui e bloqueia sem apagar.',
      );
    }
  }
}
