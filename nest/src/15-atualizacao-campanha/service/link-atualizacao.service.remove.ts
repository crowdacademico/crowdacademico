import { Injectable } from '@nestjs/common';
import { distinguir404ou403 } from '../../commons/database/distinguir-404-ou-403.util';
import { DatabaseService } from '../../commons/database/database.service';

@Injectable()
export class LinkAtualizacaoServiceRemove {
  constructor(private readonly database: DatabaseService) {}

  async executar(id: number): Promise<void> {
    const resultado = await this.database
      .getDb()
      .deleteFrom('link_atualizacao')
      .where('id_link_atualizacao', '=', id)
      .executeTakeFirst();

    if (resultado.numDeletedRows === 0n) {
      await distinguir404ou403(
        this.database.getDb(),
        'link_atualizacao',
        'id_link_atualizacao',
        id,
        'Link de atualização não encontrado.',
        'Sem permissão para excluir este link.',
      );
    }
  }
}
