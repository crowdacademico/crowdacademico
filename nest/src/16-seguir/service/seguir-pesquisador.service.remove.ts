import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';

// Mesmo raciocínio de SeguirCampanhaServiceRemove: o WHERE é sempre a própria conta, então 0 linhas só quer dizer
// "você não segue este pesquisador".
@Injectable()
export class SeguirPesquisadorServiceRemove {
  constructor(private readonly database: DatabaseService) {}

  async executar(idPesquisador: number, idUsuario: number): Promise<void> {
    const resultado = await this.database
      .getDb()
      .deleteFrom('seguir_pesquisador')
      .where('id_pesquisador', '=', idPesquisador)
      .where('id_usuario', '=', idUsuario)
      .executeTakeFirst();

    if (resultado.numDeletedRows === 0n) {
      throw new NotFoundException('Você não está seguindo este pesquisador.');
    }
  }
}
