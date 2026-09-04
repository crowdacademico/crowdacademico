import { ForbiddenException, Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseService } from '../../commons/database/database.service';

// suspender_papel_usuario/revogar_suspensao_papel_usuario
// (03_funcoes_seguranca.sql, [03-N], 09-08-2026, Bloco G) - preferível a
// UsuarioPapelServiceRemove (DELETE) quando a ideia é temporária: preserva
// quando o papel foi atribuído e volta sozinho no prazo. Exige
// 'papel_gerenciar' (mesma permissão da matriz Papel × Permissão), não
// 'usuario_suspender' - é decisão de RBAC, não de moderação de conta.
@Injectable()
export class UsuarioPapelServiceSuspender {
  constructor(private readonly database: DatabaseService) {}

  async suspender(
    idUsuario: number,
    idPapel: number,
    ate: string,
  ): Promise<void> {
    try {
      await sql`SELECT public.suspender_papel_usuario(${idUsuario}, ${idPapel}, ${ate}::timestamptz)`.execute(
        this.database.getDb(),
      );
    } catch (erro) {
      throw new ForbiddenException(
        (erro as Error).message ||
          "Sem permissão 'papel_gerenciar' para suspender papel.",
      );
    }
  }

  async revogar(idUsuario: number, idPapel: number): Promise<void> {
    try {
      await sql`SELECT public.revogar_suspensao_papel_usuario(${idUsuario}, ${idPapel})`.execute(
        this.database.getDb(),
      );
    } catch (erro) {
      throw new ForbiddenException(
        (erro as Error).message ||
          "Sem permissão 'papel_gerenciar' para revogar suspensão de papel.",
      );
    }
  }
}
