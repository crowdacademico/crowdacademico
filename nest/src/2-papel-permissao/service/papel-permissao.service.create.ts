import {
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { PapelPermissaoRequestCreate } from '../dto/request/papel-permissao.request-create';

const CODIGO_PG_UNIQUE_VIOLATION = '23505';
const CODIGO_PG_RLS_VIOLATION = '42501';

@Injectable()
export class PapelPermissaoServiceCreate {
  constructor(private readonly database: DatabaseService) {}

  async executar(dto: PapelPermissaoRequestCreate): Promise<void> {
    try {
      // pol_papelperm_insert (04) exige tem_permissao('papel_gerenciar').
      await this.database
        .getDb()
        .insertInto('papel_permissao')
        .values({ id_papel: dto.idPapel, id_permissao: dto.idPermissao })
        .execute();
    } catch (erro) {
      const codigo = (erro as { code?: string }).code;
      if (codigo === CODIGO_PG_UNIQUE_VIOLATION) {
        throw new ConflictException('Este papel já tem esta permissão.');
      }
      if (codigo === CODIGO_PG_RLS_VIOLATION) {
        throw new ForbiddenException(
          "Sem permissão 'papel_gerenciar' para conceder permissões.",
        );
      }
      throw erro;
    }
  }
}
