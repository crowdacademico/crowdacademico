import { ForbiddenException, Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseService } from '../../commons/database/database.service';
import { UsuarioResponseSuspend } from '../dto/response/usuario.response-suspend';

// suspender_usuario/revogar_suspensao_usuario (03_funcoes_seguranca.sql,
// [03-N], 09-08-2026, Bloco G do prompt do Claude Web) — mesmo padrão de
// UsuarioServiceDesbloquear: SECURITY DEFINER que já exige a permissão
// internamente (não RLS), erro do Postgres vira ForbiddenException aqui.
// "Reduzir a pena" não é um método à parte — é chamar `suspender` de novo
// com uma data mais próxima (a função já sobrescreve).
@Injectable()
export class UsuarioServiceSuspender {
  constructor(private readonly database: DatabaseService) {}

  // SAVEPOINT (09-08-2026) — buscarSuspensao roda AUTOMATICAMENTE ao abrir
  // Alterar Usuário (SecaoModeracao), não é uma ação explícita da pessoa —
  // sem essa proteção, a tela inteira de Alterar Usuário ficava dependente
  // das colunas suspenso_ate/motivo_suspensao/suspenso_por existirem
  // (Bloco G só existe de verdade depois da migração no SQL Editor, ver
  // PENDENCIAS e correcoes.md item 22). Confirmado ao vivo (09-08-2026):
  // sem isso, este endpoint sozinho já derrubava com 500 (o frontend tinha
  // um .catch() cobrindo isso, mas o endpoint em si devia responder certo,
  // não depender só do cliente engolir o erro).
  async buscarSuspensao(idUsuario: number): Promise<UsuarioResponseSuspend> {
    const db = this.database.getDb();
    await sql`SAVEPOINT sp_buscar_suspensao_usuario`.execute(db);
    try {
      const linha = await db
        .selectFrom('usuario')
        .select(['suspenso_ate', 'motivo_suspensao', 'suspenso_por'])
        .where('id_usuario', '=', idUsuario)
        .executeTakeFirst();

      return {
        suspensoAte: linha?.suspenso_ate ?? null,
        motivoSuspensao: linha?.motivo_suspensao ?? null,
        suspensoPor: linha?.suspenso_por ?? null,
      };
    } catch {
      await sql`ROLLBACK TO SAVEPOINT sp_buscar_suspensao_usuario`.execute(db);
      return { suspensoAte: null, motivoSuspensao: null, suspensoPor: null };
    }
  }

  async suspender(
    idUsuario: number,
    ate: string,
    motivo: string,
  ): Promise<void> {
    try {
      await sql`SELECT public.suspender_usuario(${idUsuario}, ${ate}::timestamptz, ${motivo})`.execute(
        this.database.getDb(),
      );
    } catch (erro) {
      throw new ForbiddenException(
        (erro as Error).message || 'Sem permissão para suspender esta conta.',
      );
    }
  }

  async revogar(idUsuario: number): Promise<void> {
    try {
      await sql`SELECT public.revogar_suspensao_usuario(${idUsuario})`.execute(
        this.database.getDb(),
      );
    } catch (erro) {
      throw new ForbiddenException(
        (erro as Error).message ||
          'Sem permissão para revogar a suspensão desta conta.',
      );
    }
  }
}
