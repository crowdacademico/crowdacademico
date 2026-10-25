import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { UsuarioPapelResponse } from '../dto/response/usuario-papel.response';

@Injectable()
export class UsuarioPapelServiceFindAllGlobal {
  constructor(private readonly database: DatabaseService) {}

  // Sem filtro de id_usuario: a coluna "papel" na listagem de Usuários precisa do vínculo de TODO MUNDO de uma
  // vez, não um por vez (evita a listagem disparar N requisições, uma por linha). pol_usuariopapel_select (04)
  // decide quem vê o quê: cada pessoa vê os próprios vínculos, e quem tem papel_gerenciar vê os de todos; sem
  // essa permissão a resposta traz só os vínculos do próprio usuário.
  async executar(): Promise<UsuarioPapelResponse[]> {
    const db = this.database.getDb();
    const linhas = await db
      .selectFrom('usuario_papel')
      .innerJoin('papel', 'papel.id_papel', 'usuario_papel.id_papel')
      .select([
        'usuario_papel.id_usuario',
        'usuario_papel.id_papel',
        'papel.nome as nomePapel',
        'papel.codigo as codigoPapel',
        'papel.ordem_exibicao as ordemExibicao',
        'usuario_papel.suspenso_ate',
      ])
      .orderBy('usuario_papel.id_usuario')
      .orderBy('papel.ordem_exibicao')
      .execute();

    return linhas.map((l) => ({
      idUsuario: l.id_usuario,
      idPapel: l.id_papel,
      nomePapel: l.nomePapel,
      codigoPapel: l.codigoPapel,
      ordemExibicao: l.ordemExibicao,
      suspensoAte: l.suspenso_ate,
    }));
  }
}
