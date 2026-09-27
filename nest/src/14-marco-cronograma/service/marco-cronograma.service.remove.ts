import { Injectable } from '@nestjs/common';
import { excluirOu404ou403 } from '../../commons/database/distinguir-404-ou-403.util';
import { DatabaseService } from '../../commons/database/database.service';

@Injectable()
export class MarcoCronogramaServiceRemove {
  constructor(private readonly database: DatabaseService) {}

  async executar(id: number): Promise<void> {
    await excluirOu404ou403(
      this.database.getDb(),
      'marco_cronograma',
      { id_marco: id },
      'Marco de cronograma não encontrado.',
      'Sem permissão para excluir este marco.',
    );
  }
}
