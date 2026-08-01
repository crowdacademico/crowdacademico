import { Selectable } from 'kysely';
import { ConfiguracoesTable } from '../../../commons/database/db.types';
import { ConfiguracaoResponseDto } from '../response/configuracao.response.dto';

export class ConfiguracaoConverter {
  static paraResponseDto(
    linha: Selectable<ConfiguracoesTable>,
  ): ConfiguracaoResponseDto {
    return {
      idConfig: linha.id_config,
      idUsuario: linha.id_usuario,
      chave: linha.chave,
      valor: linha.valor,
      tipo: linha.tipo,
      descricao: linha.descricao,
      ativo: linha.ativo,
    };
  }
}
