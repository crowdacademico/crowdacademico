import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';

// Não existe DELETE de conta (uma conta usada em repasse não pode sumir): só desativa. O GRANT UPDATE do app_nestjs é
// só da coluna `ativa` (06) e a policy exige ser a própria conta.
@Injectable()
export class ContaRecebimentoServiceDeactivate {
  constructor(private readonly database: DatabaseService) {}

  async executar(idContaRecebimento: number, idUsuario: number): Promise<void> {
    const resultado = await this.database
      .getDb()
      .updateTable('conta_recebimento_usuario')
      .set({ ativa: false })
      .where('id_conta_recebimento', '=', idContaRecebimento)
      .where('id_usuario', '=', idUsuario)
      .where('ativa', '=', true)
      .executeTakeFirst();
    if (resultado.numUpdatedRows === 0n) {
      throw new NotFoundException('Conta de recebimento ativa não encontrada.');
    }
  }
}
