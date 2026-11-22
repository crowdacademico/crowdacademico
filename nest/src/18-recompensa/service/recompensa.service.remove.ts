import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';

// Com alguém no mural, o banco recusa (fn_recompensa_trava, 05, 91067): quem entrou nunca sai.
@Injectable()
export class RecompensaServiceRemove {
  constructor(private readonly database: DatabaseService) {}

  async executar(idRecompensa: number): Promise<void> {
    const resultado = await this.database
      .getDb()
      .deleteFrom('recompensa')
      .where('id_recompensa', '=', idRecompensa)
      .executeTakeFirst();
    if (resultado.numDeletedRows === 0n) {
      throw new NotFoundException('Recompensa não encontrada, ou não é sua.');
    }
  }
}
