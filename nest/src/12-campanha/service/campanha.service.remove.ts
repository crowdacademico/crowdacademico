import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
      // pol_campanha_delete (04): status = 'aguardando_aprovacao' E (dono OU
      // campanha_editar). Mesmo padrão de campanha.service.update.ts: uma
      // campanha ainda invisível pra quem pediu (fora do alcance de
      // pol_campanha_select também) devolve 404 aqui — não vaza que existe.
      const existe = await this.database
        .getDb()
        .selectFrom('campanha')
        .select('id_campanha')
        .where('id_campanha', '=', id)
        .executeTakeFirst();
      if (!existe) {
        throw new NotFoundException('Campanha não encontrada.');
      }
      throw new ForbiddenException(
        'Sem permissão para excluir esta campanha, ou ela já não está mais aguardando aprovação.',
      );
    }
  }
}
