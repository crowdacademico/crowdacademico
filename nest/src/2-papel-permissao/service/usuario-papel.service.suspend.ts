import { Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseService } from '../../commons/database/database.service';
import { exigirQueExista } from '../../commons/database/distinguir-404-ou-403.util';

// suspender_papel_usuario/revogar_suspensao_papel_usuario (03_funcoes_seguranca.sql, [03-N]): preferível a
// UsuarioPapelServiceRemove (DELETE) quando a ideia é temporária: preserva quando o papel foi atribuído e volta
// sozinho no prazo. Exige 'papel_gerenciar' (mesma permissão da matriz Papel × Permissão), não
// 'usuario_suspender': é decisão de RBAC, não de moderação de conta.
@Injectable()
export class UsuarioPapelServiceSuspend {
  constructor(private readonly database: DatabaseService) {}

  async suspender(
    idUsuario: number,
    idPapel: number,
    ate: string,
    motivo: string,
  ): Promise<void> {
    await sql`SELECT public.suspender_papel_usuario(${idUsuario}, ${idPapel}, ${ate}::timestamptz, ${motivo})`.execute(
      this.database.getDb(),
    );
  }

  async revogar(idUsuario: number, idPapel: number): Promise<void> {
    const db = this.database.getDb();
    await sql`SELECT public.revogar_suspensao_papel_usuario(${idUsuario}, ${idPapel})`.execute(
      db,
    );
    await exigirQueExista(
      db,
      'usuario_papel',
      { id_usuario: idUsuario, id_papel: idPapel },
      'Este usuário não tem este papel.',
    );
  }
}
