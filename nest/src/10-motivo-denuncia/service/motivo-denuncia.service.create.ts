import { ForbiddenException, Injectable } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { CODIGO_PG_RLS_VIOLATION } from '../../commons/database/postgres-exception.filter';
import { MotivoDenunciaConverter } from '../dto/converter/motivo-denuncia.converter';
import { MotivoDenunciaRequestCreate } from '../dto/request/motivo-denuncia.request-create';
import { MotivoDenunciaResponse } from '../dto/response/motivo-denuncia.response';
import { temCodigoPostgres } from '../../commons/database/codigo-postgres.util';

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
      // Descrição duplicada no mesmo tipo (uq_motivo_denuncia_descricao_normalizada) segue para o filtro global,
      // que tem a mensagem certa (mensagens-duplicidade.constants.ts); aqui fica só a checagem de RLS.
      if (temCodigoPostgres(erro, CODIGO_PG_RLS_VIOLATION)) {
        throw new ForbiddenException(
          "Sem permissão 'motivo_denuncia_gerenciar' para cadastrar motivo de denúncia.",
        );
      }
      throw erro;
    }
  }
}
