import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
      const existe = await this.database
        .getDb()
        .selectFrom('link_atualizacao')
        .select('id_link_atualizacao')
        .where('id_link_atualizacao', '=', id)
        .executeTakeFirst();
      if (!existe) {
        throw new NotFoundException('Link de atualização não encontrado.');
      }
      throw new ForbiddenException('Sem permissão para excluir este link.');
    }
  }
}
