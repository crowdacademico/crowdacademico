import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';

// Sem distinção 404/403 aqui (diferente de link-academico/orcamento-
// campanha): o WHERE já é sempre id_usuario = quem está autenticado, então
// a única forma de dar 0 linhas é "esta pessoa nunca seguiu esta
// campanha" — nunca "é de outra pessoa" (a RLS de DELETE também exige
// id_usuario = id_usuario_atual(), então não existe um "de outro dono"
// possível de alcançar por aqui pra começo de conversa).
@Injectable()
export class SeguirCampanhaServiceRemove {
  constructor(private readonly database: DatabaseService) {}

  async executar(idCampanha: number, idUsuario: number): Promise<void> {
    const resultado = await this.database
      .getDb()
      .deleteFrom('seguir_campanha')
      .where('id_campanha', '=', idCampanha)
      .where('id_usuario', '=', idUsuario)
      .executeTakeFirst();

    if (resultado.numDeletedRows === 0n) {
      throw new NotFoundException('Você não está seguindo esta campanha.');
    }
  }
}
