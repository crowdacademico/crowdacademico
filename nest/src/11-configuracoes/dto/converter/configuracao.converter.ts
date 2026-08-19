import { Selectable } from 'kysely';
import { ConfiguracoesTable } from '../../../commons/database/db.types';
import { ConfiguracaoResponse } from '../response/configuracao.response';

export class ConfiguracaoConverter {
  static paraResponseDto(
    linha: Selectable<ConfiguracoesTable>,
  ): ConfiguracaoResponse {
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
