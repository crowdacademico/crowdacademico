import { ForbiddenException, Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseService } from '../../commons/database/database.service';
import { AutorizacaoService } from '../../commons/seguranca/autorizacao.service';
import { PerfilPesquisadorResponseSuspend } from '../dto/response/perfil-pesquisador.response-suspend';

// suspender_pesquisador() (03_funcoes_seguranca.sql, [03-P]): dá ao Admin poder completo sobre o pesquisador na
// Bancada. Idempotente por design (a própria função devolve FALSE sem fazer nada se já estava suspenso): nenhum
// erro é levantado nesse caso, só o RAISE EXCEPTION de permissão.
//
// Aceita ate/motivo (mesmo padrão de UsuarioServiceSuspender) e tem buscarSuspensao(), espelhando
// UsuarioServiceSuspender.buscarSuspensao, inclusive o mesmo SAVEPOINT de segurança (esta busca roda
// automaticamente ao abrir a tela, antes de qualquer ação explícita, e não pode derrubar a tela se as colunas
// novas ainda não tiverem sido aplicadas no banco de alguém).
@Injectable()
export class PerfilPesquisadorServiceSuspender {
  constructor(
    private readonly database: DatabaseService,
    private readonly autorizacao: AutorizacaoService,
  ) {}

  async buscarSuspensao(
    idUsuario: number,
  ): Promise<PerfilPesquisadorResponseSuspend> {
    await this.autorizacao.exigirProprioOuPermissao(
      idUsuario,
      'usuario_suspender',
      'Você só pode ver a suspensão do seu próprio perfil.',
    );
    const db = this.database.getDb();
    await sql`SAVEPOINT sp_buscar_suspensao_pesquisador`.execute(db);
    try {
      const linha = await db
        .selectFrom('perfil_pesquisador')
        .select(['suspenso_ate', 'motivo_suspensao', 'suspenso_por'])
        .where('id_usuario', '=', idUsuario)
        .executeTakeFirst();

      return {
        suspensoAte: linha?.suspenso_ate ?? null,
        motivoSuspensao: linha?.motivo_suspensao ?? null,
        suspensoPor: linha?.suspenso_por ?? null,
      };
    } catch {
      await sql`ROLLBACK TO SAVEPOINT sp_buscar_suspensao_pesquisador`.execute(
        db,
      );
      return { suspensoAte: null, motivoSuspensao: null, suspensoPor: null };
    }
  }

  async executar(
    idUsuario: number,
    ate: string,
    motivo: string,
  ): Promise<void> {
    try {
      await sql`SELECT public.suspender_pesquisador(${idUsuario}, ${ate}::timestamptz, ${motivo})`.execute(
        this.database.getDb(),
      );
    } catch (erro) {
      throw new ForbiddenException(
        (erro as Error).message || 'Sem permissão para suspender pesquisador.',
      );
    }
  }
}
