import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { ConfiguracoesConverter } from '../dto/converter/configuracoes.converter';
import { ConfiguracoesResponse } from '../dto/response/configuracoes.response';

@Injectable()
export class ConfiguracoesServiceFindOne {
  constructor(private readonly database: DatabaseService) {}

  async executar(idConfig: number): Promise<ConfiguracoesResponse> {
    const linha = await this.database
      .getDb()
      .selectFrom('configuracoes')
      .selectAll()
      .where('id_config', '=', idConfig)
      .executeTakeFirst();

    if (!linha) {
      throw new NotFoundException(`Configuração ${idConfig} não encontrada`);
    }

    return ConfiguracoesConverter.paraResponseDto(linha);
  }
}
