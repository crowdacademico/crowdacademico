import { Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseService } from '../../commons/database/database.service';
import { UsuarioPapelResponse } from '../dto/response/usuario-papel.response';

@Injectable()
export class UsuarioPapelServiceFindAllGeral {
  constructor(private readonly database: DatabaseService) {}

  // Sem filtro de id_usuario - pedido do Lucas (03-08-2026): coluna "papel"
  // na listagem de Usuários precisa do vínculo de TODO MUNDO de uma vez,
  // não um por vez (evita a listagem disparar N requisições, uma por
  // linha). pol_usuariopapel_select (04) decide quem vê o quê - desde
  // 07-08-2026 é USING(true) (sem exigir dono nem permissão) e o
  // controller nem tem mais RequireAuthGuard: dá pra ver o papel de todo
  // mundo sem estar logado. Não é gambiarra de conveniência - o painel
  // admin inteiro (onde isto é usado) só é alcançado por admin em
  // qualquer versão futura do sistema, então não existe "usuário comum
  // espiando quem é moderador" pra proteger aqui. Reverter pra
  // "USING (id_usuario = public.id_usuario_atual() OR public.tem_permissao('papel_gerenciar'))"
  // + RequireAuthGuard de volta só se esse pressuposto mudar.
  async executar(): Promise<UsuarioPapelResponse[]> {
    const db = this.database.getDb();

    // SAVEPOINT (09-08-2026) - mesma proteção de usuario-papel.service.
    // findall.ts: usuario_papel.suspenso_ate (Bloco G) só existe depois da
    // migração no SQL Editor. Sem isso, a coluna "papel" da listagem de
    // Usuários inteira quebrava com 500 - confirmado ao vivo (09-08-2026).
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
