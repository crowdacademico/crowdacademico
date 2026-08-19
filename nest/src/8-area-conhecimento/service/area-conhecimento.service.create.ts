import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { AreaConhecimentoConverter } from '../dto/converter/area-conhecimento.converter';
import { AreaConhecimentoRequestCreate } from '../dto/request/area-conhecimento.request-create';
import { AreaConhecimentoResponse } from '../dto/response/area-conhecimento.response';

const CODIGO_PG_UNIQUE_VIOLATION = '23505';
const CODIGO_PG_RLS_VIOLATION = '42501';

@Injectable()
export class AreaConhecimentoServiceCreate {
  constructor(private readonly database: DatabaseService) {}

  async executar(
    dto: AreaConhecimentoRequestCreate,
  ): Promise<AreaConhecimentoResponse> {
    const db = this.database.getDb();

    // Hierarquia fixa em 2 níveis (ver comentário em
    // criar-area-conhecimento.request.dto.ts): se idPai veio preenchido,
    // confere aqui que ele aponta pra uma grande área raiz de verdade
    // (id_pai IS NULL) antes do INSERT — sem essa checagem, nada no banco
    // impediria criar um 3º nível.
    if (dto.idPai !== undefined) {
      const pai = await db
        .selectFrom('area_conhecimento')
        .select(['id_area_conhecimento', 'id_pai'])
        .where('id_area_conhecimento', '=', dto.idPai)
        .executeTakeFirst();

      if (!pai) {
        throw new BadRequestException(
          `Área de conhecimento pai ${dto.idPai} não encontrada.`,
        );
      }
      if (pai.id_pai !== null) {
        throw new BadRequestException(
          'idPai precisa apontar para uma grande área raiz, não para outra área de nível 2.',
        );
      }
    }

    try {
      const linha = await db
        .insertInto('area_conhecimento')
        .values({
          codigo_cnpq: dto.codigoCnpq,
          nome: dto.nome,
          id_pai: dto.idPai ?? null,
          ...(dto.ativo !== undefined ? { ativo: dto.ativo } : {}),
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      return AreaConhecimentoConverter.paraResponseDto(linha);
    } catch (erro) {
      const codigo = (erro as { code?: string }).code;
      if (codigo === CODIGO_PG_UNIQUE_VIOLATION) {
        throw new ConflictException(
          `Já existe uma área de conhecimento com o código CNPq "${dto.codigoCnpq}".`,
        );
      }
      if (codigo === CODIGO_PG_RLS_VIOLATION) {
        throw new ForbiddenException(
          "Sem permissão 'area_conhecimento_gerenciar' para cadastrar área de conhecimento.",
        );
      }
      throw erro;
    }
  }
}
