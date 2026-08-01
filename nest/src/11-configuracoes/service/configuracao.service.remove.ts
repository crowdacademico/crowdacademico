import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';

@Injectable()
export class ConfiguracaoServiceRemove {
  constructor(private readonly database: DatabaseService) {}

  async executar(idConfig: number): Promise<void> {
    const db = this.database.getDb();

    const resultado = await db
      .deleteFrom('configuracoes')
      .where('id_config', '=', idConfig)
      .executeTakeFirst();

    if ((resultado?.numDeletedRows ?? 0n) === 0n) {
      // pol_config_delete (04): mesmo critério do update (dono ou
      // 'configuracao_gerenciar').
      const existe = await db
        .selectFrom('configuracoes')
        .select('id_config')
        .where('id_config', '=', idConfig)
        .executeTakeFirst();
      if (!existe) {
        throw new NotFoundException(`Configuração ${idConfig} não encontrada`);
      }
      throw new ForbiddenException(
        'Sem permissão para excluir esta configuração.',
      );
    }
  }
}
