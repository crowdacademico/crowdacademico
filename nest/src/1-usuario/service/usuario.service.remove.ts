import { Injectable, NotFoundException } from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseService } from '../../commons/database/database.service';

@Injectable()
export class UsuarioServiceRemove {
  constructor(private readonly database: DatabaseService) {}

  async executar(idUsuario: number): Promise<void> {
    const db = this.database.getDb();

    // Lido ANTES da função: depois dela, usuario.deletado vira TRUE e pol_usuario_select (04) esconde a linha
    // de quem não tem 'usuario_visualizar_sensivel' (o caso mais comum: a própria pessoa).
    const usuarioAntes = await db
      .selectFrom('usuario')
      .select('id_usuario')
      .where('id_usuario', '=', idUsuario)
      .executeTakeFirst();

    // Não existe DELETE de verdade em `usuario` - nem GRANT, nem policy (soft delete de propósito, ver
    // DOCUMENTACAO_BD.md, [03-O]). O único caminho é a função excluir_conta_usuario(), que exige
    // p_id_usuario = id_usuario_atual() OU a permissão 'usuario_excluir'.
    //
    // Prazo de carência (22-11-2026): a função só AGENDA a exclusão. A foto continua no armazenamento até a
    // exclusão definitiva, que apaga os bytes (UsuarioServiceFinalizarExclusoes); antes disso, a pessoa pode
    // reativar a conta entrando de novo.
    await sql`SELECT public.excluir_conta_usuario(${idUsuario})`.execute(db);
    // Depois da função (que já recusou quem não tem permissão): conta que não existe, ou já excluída, é 404.
    if (!usuarioAntes) {
      throw new NotFoundException(`Usuário ${idUsuario} não encontrado`);
    }
  }
}
