import { ForbiddenException, Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseService } from '../../commons/database/database.service';

// reativar_pesquisador() (03_funcoes_seguranca.sql, [03-N]) - mesma
// história de perfil-pesquisador.service.suspender.ts: existia só no banco.
// Mesma permissão de suspender ('usuario_suspender' - quem pode suspender
// pode reverter). Idempotente (FALSE sem erro se já estava ativo).
@Injectable()
export class PerfilPesquisadorServiceReativar {
  constructor(private readonly database: DatabaseService) {}

  async executar(idUsuario: number): Promise<void> {
    try {
      await sql`SELECT public.reativar_pesquisador(${idUsuario})`.execute(
        this.database.getDb(),
      );
    } catch (erro) {
      throw new ForbiddenException(
        (erro as Error).message || 'Sem permissão para reativar pesquisador.',
      );
    }
  }
}
