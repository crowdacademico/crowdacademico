import { ForbiddenException, Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseService } from '../../commons/database/database.service';

@Injectable()
export class UsuarioServiceRemove {
  constructor(private readonly database: DatabaseService) {}

  async executar(idUsuario: number): Promise<void> {
    // Não existe DELETE de verdade em `usuario` — nem GRANT, nem policy
    // (soft delete de propósito, ver DOCUMENTACAO_BD.md, [03-O]). O único
    // caminho é a função excluir_conta_usuario(), que exige
    // p_id_usuario = id_usuario_atual() OU a permissão 'usuario_excluir'.
    // Controller aplica RequireAuthGuard (3-auth) — sem login, nem chega aqui.
    try {
      await sql`SELECT public.excluir_conta_usuario(${idUsuario})`.execute(
        this.database.getDb(),
      );
    } catch (erro) {
      throw new ForbiddenException(
        (erro as Error).message || 'Sem permissão para excluir esta conta.',
      );
    }
  }
}
