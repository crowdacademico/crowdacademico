import {
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { MotivoDenunciaConverter } from '../dto/converter/motivo-denuncia.converter';
import { CriarMotivoDenunciaRequestDto } from '../dto/request/criar-motivo-denuncia.request.dto';
import { MotivoDenunciaResponseDto } from '../dto/response/motivo-denuncia.response.dto';

const CODIGO_PG_UNIQUE_VIOLATION = '23505';
const CODIGO_PG_RLS_VIOLATION = '42501';

@Injectable()
export class MotivoDenunciaServiceCreate {
  constructor(private readonly database: DatabaseService) {}

  async executar(
    dto: CriarMotivoDenunciaRequestDto,
  ): Promise<MotivoDenunciaResponseDto> {
    const db = this.database.getDb();
    try {
      const linha = await db
        .insertInto('motivo_denuncia')
        .values({
          codigo: dto.codigo,
          descricao: dto.descricao ?? null,
          tipo: dto.tipo,
          ...(dto.ativo !== undefined ? { ativo: dto.ativo } : {}),
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      return MotivoDenunciaConverter.paraResponseDto(linha);
    } catch (erro) {
      const codigoErro = (erro as { code?: string }).code;
      if (codigoErro === CODIGO_PG_UNIQUE_VIOLATION) {
        throw new ConflictException(
          `Já existe um motivo de denúncia com o código "${dto.codigo}".`,
        );
      }
      if (codigoErro === CODIGO_PG_RLS_VIOLATION) {
        throw new ForbiddenException(
          "Sem permissão 'motivo_denuncia_gerenciar' para cadastrar motivo de denúncia.",
        );
      }
      throw erro;
    }
  }
}
