import { Selectable } from 'kysely';
import { ConfiguracoesTable } from '../../../commons/database/db.types';
import { ConfiguracoesResponse } from '../response/configuracoes.response';

export class ConfiguracoesConverter {
  static paraResponseDto(
    linha: Selectable<ConfiguracoesTable>,
  ): ConfiguracoesResponse {
    return {
      idConfig: linha.id_config,
      idUsuario: linha.id_usuario,
      chave: linha.chave,
      valor: linha.valor,
      tipo: linha.tipo,
      descricao: linha.descricao,
      ativo: linha.ativo,
      publica: linha.publica,
    };
  }
}
