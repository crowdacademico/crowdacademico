import { Injectable } from '@nestjs/common';
import { excluirOu404ou403 } from '../../commons/database/distinguir-404-ou-403.util';
import { DatabaseService } from '../../commons/database/database.service';

// Excluir de vez (RF-053): só a moderação (pol_atualizacao_delete, 04); o dono sempre exclui mantendo o registro. Os anexos vão junto (ON DELETE CASCADE).
// Excluir mantendo o registro é o PATCH com ativo = false.
@Injectable()
export class AtualizacaoCampanhaServiceRemove {
  constructor(private readonly database: DatabaseService) {}

  async executar(id: number): Promise<void> {
    await excluirOu404ou403(
      this.database.getDb(),
      'atualizacao_campanha',
      { id_atualizacao: id },
      'Atualização de campanha não encontrada.',
      'Só a moderação apaga uma atualização de vez.',
    );
  }
}
