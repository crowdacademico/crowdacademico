import { ForbiddenException, Injectable } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { MotivoDenunciaConverter } from '../dto/converter/motivo-denuncia.converter';
import { MotivoDenunciaRequestCreate } from '../dto/request/motivo-denuncia.request-create';
import { MotivoDenunciaResponse } from '../dto/response/motivo-denuncia.response';

const CODIGO_PG_RLS_VIOLATION = '42501';

@Injectable()
export class MotivoDenunciaServiceCreate {
  constructor(private readonly database: DatabaseService) {}

  async executar(
    dto: MotivoDenunciaRequestCreate,
  ): Promise<MotivoDenunciaResponse> {
    const db = this.database.getDb();
    try {
      const linha = await db
        .insertInto('motivo_denuncia')
        .values({
          descricao: dto.descricao,
          tipo: dto.tipo,
          ...(dto.ativo !== undefined ? { ativo: dto.ativo } : {}),
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      return MotivoDenunciaConverter.paraResponseDto(linha);
    } catch (erro) {
      // Sem `codigo` (18-08-2026, ver comentário no DTO), a tabela não
      // tem mais nenhuma UNIQUE constraint própria - 23505 não é mais um
      // caso possível aqui, só a checagem de RLS permanece.
      if ((erro as { code?: string }).code === CODIGO_PG_RLS_VIOLATION) {
        throw new ForbiddenException(
          "Sem permissão 'motivo_denuncia_gerenciar' para cadastrar motivo de denúncia.",
        );
      }
      throw erro;
    }
  }
}
