import { Injectable, NotFoundException } from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseService } from '../../commons/database/database.service';
import { USUARIO_COLUNAS_SELECT } from '../constants/usuario.constants';
import { UsuarioConverter } from '../dto/converter/usuario.converter';
import { UsuarioResponseDto } from '../dto/response/usuario.response.dto';

@Injectable()
export class UsuarioServiceFindOne {
  constructor(private readonly database: DatabaseService) {}

  async executar(idUsuario: number): Promise<UsuarioResponseDto> {
    const usuario = await this.database
      .getDb()
      .selectFrom('usuario')
      .select(USUARIO_COLUNAS_SELECT)
      .where('id_usuario', '=', idUsuario)
      .where('deletado', '=', false)
      .executeTakeFirst();

    if (!usuario) {
      throw new NotFoundException(`Usuário ${idUsuario} não encontrado`);
    }

    const preferencias = await this.buscarPreferencias(idUsuario);
    return UsuarioConverter.paraResponseDto(usuario, preferencias);
  }

  // SAVEPOINT (10-08-2026) — mesma proteção de buscarSuspensao
  // (usuario.service.suspender.ts/auth.service.login.ts): tema_preferido/
  // escala_fonte_preferida só existem de verdade depois de alguém colar
  // ATUALIZAR O SUPABASE.sql no SQL Editor. Este método é chamado por
  // TODO login/refresh (via executar() acima) — sem essa proteção, a
  // migração ainda não aplicada derrubaria login inteiro com 500, não só
  // esta preferência. Falha graciosamente: sem as colunas, ninguém tem
  // preferência salva ainda (mesmo significado de NULL).
  private async buscarPreferencias(
    idUsuario: number,
  ): Promise<{ temaPreferido: string | null; escalaFontePreferida: number | null }> {
    const db = this.database.getDb();
    await sql`SAVEPOINT sp_buscar_preferencias_usuario`.execute(db);
    try {
      const resultado = await sql<{
        tema_preferido: string | null;
        escala_fonte_preferida: number | null;
      }>`SELECT tema_preferido, escala_fonte_preferida FROM usuario WHERE id_usuario = ${idUsuario}`.execute(
        db,
      );
      const linha = resultado.rows[0];
      return {
        temaPreferido: linha?.tema_preferido ?? null,
        escalaFontePreferida: linha?.escala_fonte_preferida ?? null,
      };
    } catch {
      await sql`ROLLBACK TO SAVEPOINT sp_buscar_preferencias_usuario`.execute(db);
      return { temaPreferido: null, escalaFontePreferida: null };
    }
  }
}
