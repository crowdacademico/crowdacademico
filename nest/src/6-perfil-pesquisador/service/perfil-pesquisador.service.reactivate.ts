import { Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseService } from '../../commons/database/database.service';
import { exigirQueExista } from '../../commons/database/distinguir-404-ou-403.util';

// reativar_pesquisador() (03_funcoes_seguranca.sql, [03-N]) - mesma
// história de perfil-pesquisador.service.suspend.ts: existia só no banco.
// Mesma permissão de suspender ('usuario_suspender' - quem pode suspender
// pode reverter). Idempotente (FALSE sem erro se já estava ativo).
@Injectable()
export class PerfilPesquisadorServiceReactivate {
  constructor(private readonly database: DatabaseService) {}

  async executar(idUsuario: number): Promise<void> {
    const db = this.database.getDb();
    await sql`SELECT public.reativar_pesquisador(${idUsuario})`.execute(db);
    await exigirQueExista(
      db,
      'perfil_pesquisador',
      { id_usuario: idUsuario },
      `Pesquisador ${idUsuario} não encontrado`,
    );
  }
}
