import { Injectable } from '@nestjs/common';
import {
  ParametrosPaginacao,
  ResultadoPaginado,
  paginar,
} from '../../commons/database/paginacao.util';
import { DatabaseService } from '../../commons/database/database.service';
import { ConfiguracaoConverter } from '../dto/converter/configuracao.converter';
import { ConfiguracaoResponseDto } from '../dto/response/configuracao.response.dto';

@Injectable()
export class ConfiguracaoServiceFindAll {
  constructor(private readonly database: DatabaseService) {}

  async executar(
    paginacao?: ParametrosPaginacao,
  ): Promise<ResultadoPaginado<ConfiguracaoResponseDto>> {
    // pol_config_select (04): id_usuario IS NULL (config global, qualquer um
    // vê) OR id_usuario = id_usuario_atual() (a própria preferência pessoal).
    // Anônimo só enxerga as globais.
    const query = this.database
      .getDb()
      .selectFrom('configuracoes')
      .selectAll()
      .orderBy('id_config');

    const resultado = await paginar(query, paginacao);
    return {
      ...resultado,
      dados: resultado.dados.map((linha) =>
        ConfiguracaoConverter.paraResponseDto(linha),
      ),
    };
  }
}
