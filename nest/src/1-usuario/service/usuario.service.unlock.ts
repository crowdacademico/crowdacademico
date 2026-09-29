import { Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseService } from '../../commons/database/database.service';
import { exigirQueExista } from '../../commons/database/distinguir-404-ou-403.util';

@Injectable()
export class UsuarioServiceUnlock {
  constructor(private readonly database: DatabaseService) {}

  // liberar_bloqueio_login() (03_funcoes_seguranca.sql, [03-O]) zera tentativas_login_falhas e bloqueado_ate:
  // SECURITY DEFINER, exige a permissão 'usuario_desbloquear' internamente (checagem própria da função, não
  // RLS). É o único jeito de desbloquear, pelo painel, uma conta bloqueada por excesso de tentativas de login.
  async executar(idUsuario: number): Promise<void> {
    const db = this.database.getDb();
    await sql`SELECT public.liberar_bloqueio_login(${idUsuario})`.execute(db);
    await exigirQueExista(
      db,
      'usuario',
      { id_usuario: idUsuario, deletado: false },
      `Usuário ${idUsuario} não encontrado`,
    );
  }
}
