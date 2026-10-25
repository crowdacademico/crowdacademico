import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { UsuarioPapelResponse } from '../dto/response/usuario-papel.response';

@Injectable()
export class UsuarioPapelServiceFindAll {
  constructor(private readonly database: DatabaseService) {}

  async executar(idUsuario: number): Promise<UsuarioPapelResponse[]> {
    // pol_usuariopapel_select (04): id_usuario_atual() = idUsuario OU
    // tem_permissao('papel_gerenciar'). Sem nenhum dos dois, a query só
    // devolve 0 linhas (RLS filtra, sem erro) - não dá pra saber se o
    // usuário não tem papel nenhum ou se só não tinha permissão de ver.
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
      .where('usuario_papel.id_usuario', '=', idUsuario)
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
