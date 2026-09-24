import { Injectable } from '@nestjs/common';
import { distinguir404ou403 } from '../../commons/database/distinguir-404-ou-403.util';
import { DatabaseService } from '../../commons/database/database.service';

@Injectable()
export class CampanhaServiceRemove {
  constructor(private readonly database: DatabaseService) {}

  async executar(id: number): Promise<void> {
    const linha = await this.database
      .getDb()
      .deleteFrom('campanha')
      .where('id_campanha', '=', id)
      .returning('id_campanha')
      .executeTakeFirst();

    if (!linha) {
      // pol_campanha_delete (04): status = 'rascunho' E (dono OU
      // campanha_editar). Depois de enviada pra fila, a campanha não pode mais
      // ser excluída pelo pesquisador (a rejeitada some sozinha quando o prazo
      // de reenvio vence, ver expirar_campanhas_rejeitadas). Mesmo padrão de campanha.service.update.ts: uma
      // campanha ainda invisível pra quem pediu (fora do alcance de
      // pol_campanha_select também) devolve 404 aqui - não vaza que existe.
      await distinguir404ou403(
        this.database.getDb(),
        'campanha',
        'id_campanha',
        id,
        'Campanha não encontrada.',
        'Só é possível excluir uma campanha em rascunho, e só o dono (ou quem tem permissão) pode fazer isso.',
      );
    }
  }
}
