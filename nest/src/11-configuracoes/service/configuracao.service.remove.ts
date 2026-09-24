import { Injectable } from '@nestjs/common';
import { distinguir404ou403 } from '../../commons/database/distinguir-404-ou-403.util';
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

    // `resultado` nunca é undefined - mesmo motivo de
    // motivo-denuncia.service.remove.ts (executeTakeFirst() de DELETE
    // sempre resolve pro DeleteResult sintetizado pelo Kysely).
    if (resultado.numDeletedRows === 0n) {
      // pol_config_delete (04): mesmo critério do update (dono ou
      // 'configuracao_gerenciar').
      await distinguir404ou403(
        db,
        'configuracoes',
        { id_config: idConfig },
        `Configuração ${idConfig} não encontrada`,
        'Sem permissão para excluir esta configuração.',
      );
    }
  }
}
