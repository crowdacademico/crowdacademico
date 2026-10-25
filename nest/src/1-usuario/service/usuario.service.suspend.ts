import { Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseService } from '../../commons/database/database.service';
import { exigirQueExista } from '../../commons/database/distinguir-404-ou-403.util';
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

  async buscarSuspensao(idUsuario: number): Promise<SuspensaoResponseDto> {
    await this.autorizacao.exigirProprioOuPermissao(
      idUsuario,
      'usuario_suspender',
      'Você só pode ver a suspensão da sua própria conta.',
    );
    const linha = await this.database
      .getDb()
      .selectFrom('usuario')
      .select(['suspenso_ate', 'motivo_suspensao', 'suspenso_por'])
      .where('id_usuario', '=', idUsuario)
      .executeTakeFirst();

    return {
      suspensoAte: linha?.suspenso_ate ?? null,
      motivoSuspensao: linha?.motivo_suspensao ?? null,
      suspensoPor: linha?.suspenso_por ?? null,
    };
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
    const db = this.database.getDb();
    await sql`SELECT public.revogar_suspensao_usuario(${idUsuario})`.execute(
      db,
    );
    await exigirQueExista(
      db,
      'usuario',
      { id_usuario: idUsuario, deletado: false },
      `Usuário ${idUsuario} não encontrado`,
    );
  }
}
