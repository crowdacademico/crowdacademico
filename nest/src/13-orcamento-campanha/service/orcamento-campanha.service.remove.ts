import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
      const existe = await this.database
        .getDb()
        .selectFrom('orcamento_campanha')
        .select('id_orcamento')
        .where('id_orcamento', '=', id)
        .executeTakeFirst();
      if (!existe) {
        throw new NotFoundException('Item de orçamento não encontrado.');
      }
      throw new ForbiddenException(
        'Sem permissão para excluir este item de orçamento.',
      );
    }
  }
}
