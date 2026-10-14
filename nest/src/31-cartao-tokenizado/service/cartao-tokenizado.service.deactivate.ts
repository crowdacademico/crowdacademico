import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';

// Remover um cartão salvo = desativar (o GRANT UPDATE do app_nestjs é só da coluna `ativo`, 06).
@Injectable()
export class CartaoTokenizadoServiceDeactivate {
  constructor(private readonly database: DatabaseService) {}

  async executar(idCartao: number, idUsuario: number): Promise<void> {
    const resultado = await this.database
      .getDb()
      .updateTable('cartao_tokenizado_usuario')
      .set({ ativo: false })
      .where('id_cartao', '=', idCartao)
      .where('id_usuario', '=', idUsuario)
      .where('ativo', '=', true)
      .executeTakeFirst();
    if (resultado.numUpdatedRows === 0n) {
      throw new NotFoundException('Cartão não encontrado.');
    }
  }
}
