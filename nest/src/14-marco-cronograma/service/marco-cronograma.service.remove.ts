import { Injectable } from '@nestjs/common';
import { distinguir404ou403 } from '../../commons/database/distinguir-404-ou-403.util';
import { DatabaseService } from '../../commons/database/database.service';

@Injectable()
export class MarcoCronogramaServiceRemove {
  constructor(private readonly database: DatabaseService) {}

  async executar(id: number): Promise<void> {
    const resultado = await this.database
      .getDb()
      .deleteFrom('marco_cronograma')
      .where('id_marco', '=', id)
      .executeTakeFirst();

    if (resultado.numDeletedRows === 0n) {
      await distinguir404ou403(
        this.database.getDb(),
        'marco_cronograma',
        { id_marco: id },
        'Marco de cronograma não encontrado.',
        'Sem permissão para excluir este marco.',
      );
    }
  }
}
