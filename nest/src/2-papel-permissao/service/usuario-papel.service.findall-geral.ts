import { Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseService } from '../../commons/database/database.service';
import { UsuarioPapelResponse } from '../dto/response/usuario-papel.response';

@Injectable()
export class UsuarioPapelServiceFindAllGeral {
  constructor(private readonly database: DatabaseService) {}

  // Sem filtro de id_usuario: a coluna "papel" na listagem de Usuários precisa do vínculo de TODO MUNDO de uma
  // vez, não um por vez (evita a listagem disparar N requisições, uma por linha). pol_usuariopapel_select (04)
  // decide quem vê o quê: cada pessoa vê os próprios vínculos, e quem tem papel_gerenciar vê os de todos; sem
  // essa permissão a resposta traz só os vínculos do próprio usuário.
  async executar(): Promise<UsuarioPapelResponse[]> {
    const db = this.database.getDb();

    // SAVEPOINT: mesma proteção de usuario-papel.service.findall.ts: usuario_papel.suspenso_ate só existe
    // depois da migração no SQL Editor; sem isso, a coluna "papel" da listagem de Usuários inteira quebraria
    // com 500.
    await sql`SAVEPOINT sp_usuario_papel_suspenso_geral`.execute(db);
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
        .orderBy('usuario_papel.id_usuario')
        .execute();

      return linhas.map((l) => ({
        idUsuario: l.id_usuario,
        idPapel: l.id_papel,
        nomePapel: l.nomePapel,
        suspensoAte: l.suspenso_ate,
      }));
    } catch {
      await sql`ROLLBACK TO SAVEPOINT sp_usuario_papel_suspenso_geral`.execute(
        db,
      );
      const linhas = await db
        .selectFrom('usuario_papel')
        .innerJoin('papel', 'papel.id_papel', 'usuario_papel.id_papel')
        .select([
          'usuario_papel.id_usuario',
          'usuario_papel.id_papel',
          'papel.nome as nomePapel',
        ])
        .orderBy('usuario_papel.id_usuario')
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
