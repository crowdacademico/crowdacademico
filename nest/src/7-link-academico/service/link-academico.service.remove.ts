import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';

@Injectable()
export class LinkAcademicoServiceRemove {
  constructor(private readonly database: DatabaseService) {}

  async executar(id: number): Promise<void> {
    const resultado = await this.database
      .getDb()
      .deleteFrom('link_academico')
      .where('id_link_academico', '=', id)
      .executeTakeFirst();

    if (resultado.numDeletedRows === 0n) {
      // pol_link_delete (04): dono OU link_academico_gerenciar.
      const existe = await this.database
        .getDb()
        .selectFrom('link_academico')
        .select('id_link_academico')
        .where('id_link_academico', '=', id)
        .executeTakeFirst();
      if (!existe) {
        throw new NotFoundException('Link acadêmico não encontrado.');
      }
      throw new ForbiddenException('Sem permissão para excluir este link.');
    }
  }
}
