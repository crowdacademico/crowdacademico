import {
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { ConfiguracaoConverter } from '../dto/converter/configuracao.converter';
import { CriarConfiguracaoRequestDto } from '../dto/request/criar-configuracao.request.dto';
import { ConfiguracaoResponseDto } from '../dto/response/configuracao.response.dto';

const CODIGO_PG_UNIQUE_VIOLATION = '23505';
const CODIGO_PG_RLS_VIOLATION = '42501';

@Injectable()
export class ConfiguracaoServiceCreate {
  constructor(private readonly database: DatabaseService) {}

  async executar(
    dto: CriarConfiguracaoRequestDto,
    idUsuarioAutenticado: number,
  ): Promise<ConfiguracaoResponseDto> {
    // id_usuario decidido aqui, nunca aceito do corpo da requisição — pol_
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
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      return ConfiguracaoConverter.paraResponseDto(linha);
    } catch (erro) {
      const codigo = (erro as { code?: string }).code;
      if (codigo === CODIGO_PG_UNIQUE_VIOLATION) {
        throw new ConflictException(
          `Já existe uma configuração com a chave "${dto.chave}".`,
        );
      }
      if (codigo === CODIGO_PG_RLS_VIOLATION) {
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
