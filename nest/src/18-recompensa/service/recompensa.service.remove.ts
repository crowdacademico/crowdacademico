import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { CODIGO_PG_FOREIGN_KEY_VIOLATION } from '../../commons/database/postgres-exception.filter';

// DELETE /recompensa/:idRecompensa (14-11-2026). Só a recompensa que ninguém ganhou ainda: a que já foi concedida
// fica presa por FK_CONTRIBUICAO_RECOMPENSA_RECOMPENSA (ON DELETE RESTRICT, 01), porque quem ganhou precisa
// continuar vendo; essa se desativa no Alterar. O link e os arquivos dela vão junto (ON DELETE CASCADE). Quem pode
// (dono da campanha ou campanha_editar) é a pol_recompensa_delete (04).
@Injectable()
export class RecompensaServiceRemove {
  constructor(private readonly database: DatabaseService) {}

  async executar(idRecompensa: number): Promise<void> {
    let apagadas: bigint;
    try {
      const resultado = await this.database
        .getDb()
        .deleteFrom('recompensa')
        .where('id_recompensa', '=', idRecompensa)
        .executeTakeFirst();
      apagadas = resultado.numDeletedRows;
    } catch (erro) {
      if (
        (erro as { code?: string }).code === CODIGO_PG_FOREIGN_KEY_VIOLATION
      ) {
        throw new ConflictException(
          'Esta recompensa já foi concedida a quem apoiou e não pode ser excluída. Para tirá-la do ar, desative em Alterar.',
        );
      }
      throw erro;
    }
    if (apagadas === 0n) {
      throw new NotFoundException('Recompensa não encontrada, ou não é sua.');
    }
  }
}
