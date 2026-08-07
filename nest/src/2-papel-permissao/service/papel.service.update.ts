import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { AtualizarPapelRequestDto } from '../dto/request/atualizar-papel.request.dto';
import { PapelResponseDto } from '../dto/response/papel.response.dto';

const CODIGO_PG_UNIQUE_VIOLATION = '23505';
const CODIGO_PG_RLS_VIOLATION = '42501';

@Injectable()
export class PapelServiceUpdate {
  constructor(private readonly database: DatabaseService) {}

  // Só `nome` é atualizável (GRANT UPDATE (nome) ON papel — 06_grants.sql
  // [06-B] — a coluna `codigo`, que as triggers de RBAC leem, não tem
  // GRANT nenhum: nem chega a ser possível tentar mudá-la por aqui, o DTO
  // nem tem esse campo).
  async executar(
    idPapel: number,
    dto: AtualizarPapelRequestDto,
  ): Promise<PapelResponseDto> {
    try {
      const linha = await this.database
        .getDb()
        .updateTable('papel')
        .set({ nome: dto.nome })
        .where('id_papel', '=', idPapel)
        .returningAll()
        .executeTakeFirst();

      if (!linha) {
        // pol_papel_update (04): exige tem_permissao('papel_gerenciar'). 0
        // linhas afetadas sem erro é a RLS filtrando — diferencia de "não
        // existe" (só há uma condição no WHERE, o id).
        const existe = await this.database
          .getDb()
          .selectFrom('papel')
          .select('id_papel')
          .where('id_papel', '=', idPapel)
          .executeTakeFirst();
        if (!existe) {
          throw new NotFoundException(`Papel ${idPapel} não encontrado.`);
        }
        throw new ForbiddenException(
          "Sem permissão 'papel_gerenciar' para renomear papéis.",
        );
      }

      return { idPapel: linha.id_papel, nome: linha.nome };
    } catch (erro) {
      if (
        erro instanceof NotFoundException ||
        erro instanceof ForbiddenException
      ) {
        throw erro;
      }
      const codigo = (erro as { code?: string }).code;
      if (codigo === CODIGO_PG_UNIQUE_VIOLATION) {
        throw new ConflictException('Já existe um papel com este nome.');
      }
      if (codigo === CODIGO_PG_RLS_VIOLATION) {
        throw new ForbiddenException(
          "Sem permissão 'papel_gerenciar' para renomear papéis.",
        );
      }
      throw erro;
    }
  }
}
