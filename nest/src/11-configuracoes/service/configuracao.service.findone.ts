import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { ConfiguracaoConverter } from '../dto/converter/configuracao.converter';
import { ConfiguracaoResponse } from '../dto/response/configuracao.response';

@Injectable()
export class ConfiguracaoServiceFindOne {
  constructor(private readonly database: DatabaseService) {}

  async executar(idConfig: number): Promise<ConfiguracaoResponse> {
    const linha = await this.database
      .getDb()
      .selectFrom('configuracoes')
      .selectAll()
      .where('id_config', '=', idConfig)
      .executeTakeFirst();

    if (!linha) {
      throw new NotFoundException(`Configuração ${idConfig} não encontrada`);
    }

    return ConfiguracaoConverter.paraResponseDto(linha);
  }
}
