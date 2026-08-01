import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { ConfiguracaoConverter } from '../dto/converter/configuracao.converter';
import { ConfiguracaoResponseDto } from '../dto/response/configuracao.response.dto';

@Injectable()
export class ConfiguracaoServiceFindOne {
  constructor(private readonly database: DatabaseService) {}

  async executar(idConfig: number): Promise<ConfiguracaoResponseDto> {
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
