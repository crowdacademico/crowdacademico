import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
      const existe = await this.database
        .getDb()
        .selectFrom('marco_cronograma')
        .select('id_marco')
        .where('id_marco', '=', id)
        .executeTakeFirst();
      if (!existe) {
        throw new NotFoundException('Marco de cronograma não encontrado.');
      }
      throw new ForbiddenException('Sem permissão para excluir este marco.');
    }
  }
}
