import { Injectable } from '@nestjs/common';
import { distinguir404ou403 } from '../../commons/database/distinguir-404-ou-403.util';
import { DatabaseService } from '../../commons/database/database.service';

@Injectable()
export class OrcamentoCampanhaServiceRemove {
  constructor(private readonly database: DatabaseService) {}

  async executar(id: number): Promise<void> {
    const resultado = await this.database
      .getDb()
      .deleteFrom('orcamento_campanha')
      .where('id_orcamento', '=', id)
      .executeTakeFirst();

    if (resultado.numDeletedRows === 0n) {
      await distinguir404ou403(
        this.database.getDb(),
        'orcamento_campanha',
        'id_orcamento',
        id,
        'Item de orçamento não encontrado.',
        'Sem permissão para excluir este item de orçamento.',
      );
    }
  }
}
