import { Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseService } from '../../commons/database/database.service';
import { AutorizacaoService } from '../../commons/seguranca/autorizacao.service';
import { SuspensaoResponseDto } from '../../commons/moderacao/dto/suspensao.response.dto';

// suspender_usuario/revogar_suspensao_usuario (03_funcoes_seguranca.sql, [03-N]): mesmo padrão de
// UsuarioServiceUnlock (SECURITY DEFINER que já exige a permissão internamente, não RLS). A recusa sai com
// ERRCODE 92020/92021 (403) ou 90020 (motivo vazio, 400), traduzida pelo filtro global. "Reduzir a pena" não é um método à parte: é chamar `suspender` de novo com uma
// data mais próxima (a função já sobrescreve).
@Injectable()
export class UsuarioServiceSuspend {
  constructor(
    private readonly database: DatabaseService,
    private readonly autorizacao: AutorizacaoService,
  ) {}

  // SAVEPOINT: buscarSuspensao roda AUTOMATICAMENTE ao abrir Alterar Usuário (SecaoModeracao), não é uma ação
  // explícita da pessoa; sem essa proteção, a tela inteira dependeria das colunas
  // suspenso_ate/motivo_suspensao/suspenso_por existirem no banco, e o endpoint sozinho derrubaria com 500 (o
  // endpoint deve responder certo, não depender de o cliente engolir o erro).
  async buscarSuspensao(idUsuario: number): Promise<SuspensaoResponseDto> {
    await this.autorizacao.exigirProprioOuPermissao(
      idUsuario,
      'usuario_suspender',
      'Você só pode ver a suspensão da sua própria conta.',
    );
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
    await sql`SELECT public.suspender_usuario(${idUsuario}, ${ate}::timestamptz, ${motivo})`.execute(
      this.database.getDb(),
    );
  }

  async revogar(idUsuario: number): Promise<void> {
    await sql`SELECT public.revogar_suspensao_usuario(${idUsuario})`.execute(
      this.database.getDb(),
    );
  }
}
