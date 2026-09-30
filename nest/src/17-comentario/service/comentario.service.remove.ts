import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { distinguir404ou403 } from '../../commons/database/distinguir-404-ou-403.util';

// Excluir de vez um comentário recebido. pol_comentario_delete (04): só o dono da campanha, e só comentário ativo
// ("excluir e bloquear" é o PATCH ativo = false, e o bloqueado não se apaga). O autor não é avisado.
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
        'Só o dono da campanha exclui um comentário recebido, e um comentário bloqueado não pode ser excluído.',
      );
    }
  }
}
