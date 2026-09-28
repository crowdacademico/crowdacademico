import { ForbiddenException, Injectable } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { CODIGO_PG_RLS_VIOLATION } from '../../commons/database/postgres-exception.filter';
import { ConfiguracoesConverter } from '../dto/converter/configuracoes.converter';
import { ConfiguracoesRequestCreate } from '../dto/request/configuracoes.request-create';
import { ConfiguracoesResponse } from '../dto/response/configuracoes.response';
import { temCodigoPostgres } from '../../commons/database/codigo-postgres.util';

@Injectable()
export class ConfiguracoesServiceCreate {
  constructor(private readonly database: DatabaseService) {}

  async executar(
    dto: ConfiguracoesRequestCreate,
    idUsuarioAutenticado: number,
  ): Promise<ConfiguracoesResponse> {
    // id_usuario decidido aqui, nunca aceito do corpo da requisição - pol_
    // config_insert (04) exige, pra linha global (id_usuario NULL),
    // tem_permissao('configuracao_gerenciar'); pra linha pessoal, exige
    // id_usuario = id_usuario_atual() exatamente. Se o cliente pudesse
    // mandar id_usuario direto, dava pra tentar criar "preferência pessoal"
    // em nome de outro usuário (a RLS bloquearia, mas nem deveria chegar
    // nesse ponto).
    const idUsuario = dto.global ? null : idUsuarioAutenticado;

    try {
      const linha = await this.database
        .getDb()
        .insertInto('configuracoes')
        .values({
          id_usuario: idUsuario,
          chave: dto.chave,
          valor: dto.valor ?? null,
          tipo: dto.tipo,
          descricao: dto.descricao ?? null,
          ...(dto.publica !== undefined ? { publica: dto.publica } : {}),
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      return ConfiguracoesConverter.paraResponseDto(linha);
    } catch (erro) {
      // Chave duplicada segue para o filtro global (mensagens-duplicidade.constants.ts).
      if (temCodigoPostgres(erro, CODIGO_PG_RLS_VIOLATION)) {
        throw new ForbiddenException(
          dto.global
            ? "Sem permissão 'configuracao_gerenciar' para criar configuração global."
            : 'Sem permissão para criar esta configuração.',
        );
      }
      throw erro;
    }
  }
}
