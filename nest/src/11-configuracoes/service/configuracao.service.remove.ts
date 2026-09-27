import { Injectable } from '@nestjs/common';
import { excluirOu404ou403 } from '../../commons/database/distinguir-404-ou-403.util';
import { DatabaseService } from '../../commons/database/database.service';

@Injectable()
export class ConfiguracaoServiceRemove {
  constructor(private readonly database: DatabaseService) {}

  async executar(idConfig: number): Promise<void> {
    // pol_config_delete (04): mesmo critério do update (dono ou
    // 'configuracao_gerenciar').
    await excluirOu404ou403(
      this.database.getDb(),
      'configuracoes',
      { id_config: idConfig },
      `Configuração ${idConfig} não encontrada`,
      'Sem permissão para excluir esta configuração.',
    );
  }
}
