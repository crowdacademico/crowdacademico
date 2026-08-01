import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { ConfiguracaoConverter } from '../dto/converter/configuracao.converter';
import { ConfiguracaoResponseDto } from '../dto/response/configuracao.response.dto';

@Injectable()
export class ConfiguracaoServiceFindAll {
  constructor(private readonly database: DatabaseService) {}

  async executar(): Promise<ConfiguracaoResponseDto[]> {
    // pol_config_select (04): id_usuario IS NULL (config global, qualquer um
    // vê) OR id_usuario = id_usuario_atual() (a própria preferência pessoal).
    // Anônimo só enxerga as globais.
    const linhas = await this.database
      .getDb()
      .selectFrom('configuracoes')
      .selectAll()
      .orderBy('chave')
      .execute();

    return linhas.map((l) => ConfiguracaoConverter.paraResponseDto(l));
  }
}
