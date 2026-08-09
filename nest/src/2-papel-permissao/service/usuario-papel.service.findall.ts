import { Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseService } from '../../commons/database/database.service';
import { UsuarioPapelResponseDto } from '../dto/response/usuario-papel.response.dto';

@Injectable()
export class UsuarioPapelServiceFindAll {
  constructor(private readonly database: DatabaseService) {}

  async executar(idUsuario: number): Promise<UsuarioPapelResponseDto[]> {
    // pol_usuariopapel_select (04): id_usuario_atual() = idUsuario OU
    // tem_permissao('papel_gerenciar'). Sem nenhum dos dois, a query só
    // devolve 0 linhas (RLS filtra, sem erro) — não dá pra saber se o
    // usuário não tem papel nenhum ou se só não tinha permissão de ver.
    const db = this.database.getDb();

    // SAVEPOINT (09-08-2026) — usuario_papel.suspenso_ate (Bloco G) só
    // existe de verdade depois de alguém colar ATUALIZAR O SUPABASE.sql no
    // SQL Editor (PENDENCIAS e correcoes.md, item 22). Sem isso, esta
    // query quebrava a listagem inteira de papéis de um usuário com 500 —
    // confirmado ao vivo (09-08-2026). Mesmo padrão de
    // auth.service.login.ts/listarPapeis: tenta com a coluna nova,
    // ROLLBACK TO SAVEPOINT + repete sem ela se a coluna não existir.
    await sql`SAVEPOINT sp_usuario_papel_suspenso`.execute(db);
    try {
      const linhas = await db
        .selectFrom('usuario_papel')
        .innerJoin('papel', 'papel.id_papel', 'usuario_papel.id_papel')
        .select([
          'usuario_papel.id_usuario',
          'usuario_papel.id_papel',
          'papel.nome as nomePapel',
          'usuario_papel.suspenso_ate',
        ])
        .where('usuario_papel.id_usuario', '=', idUsuario)
        .orderBy('papel.nome')
        .execute();

      return linhas.map((l) => ({
        idUsuario: l.id_usuario,
        idPapel: l.id_papel,
        nomePapel: l.nomePapel,
        suspensoAte: l.suspenso_ate,
      }));
    } catch {
      await sql`ROLLBACK TO SAVEPOINT sp_usuario_papel_suspenso`.execute(db);
      const linhas = await db
        .selectFrom('usuario_papel')
        .innerJoin('papel', 'papel.id_papel', 'usuario_papel.id_papel')
        .select([
          'usuario_papel.id_usuario',
          'usuario_papel.id_papel',
          'papel.nome as nomePapel',
        ])
        .where('usuario_papel.id_usuario', '=', idUsuario)
        .orderBy('papel.nome')
        .execute();

      return linhas.map((l) => ({
        idUsuario: l.id_usuario,
        idPapel: l.id_papel,
        nomePapel: l.nomePapel,
        suspensoAte: null,
      }));
    }
  }
}
