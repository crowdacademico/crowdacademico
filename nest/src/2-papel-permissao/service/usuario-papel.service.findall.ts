import { Injectable } from '@nestjs/common';
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
    const linhas = await this.database
      .getDb()
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
    }));
  }
}
