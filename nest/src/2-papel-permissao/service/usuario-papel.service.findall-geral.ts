import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { UsuarioPapelResponseDto } from '../dto/response/usuario-papel.response.dto';

@Injectable()
export class UsuarioPapelServiceFindAllGeral {
  constructor(private readonly database: DatabaseService) {}

  // Sem filtro de id_usuario — pedido do Lucas (03-08-2026): coluna "papel"
  // na listagem de Usuários precisa do vínculo de TODO MUNDO de uma vez,
  // não um por vez (evita a listagem disparar N requisições, uma por
  // linha). pol_usuariopapel_select (04) decide quem vê o quê — desde
  // 07-08-2026 é USING(true) TEMPORARIAMENTE (pedido do Lucas: qualquer
  // sessão logada vê o papel de todo mundo, pra agilizar teste manual
  // enquanto o sistema está em construção; a ideia original era só
  // dono OU tem_permissao('papel_gerenciar') — ver comentário na policy
  // pra reverter quando o RBAC de verdade entrar em vigor).
  async executar(): Promise<UsuarioPapelResponseDto[]> {
    const linhas = await this.database
      .getDb()
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
    }));
  }
}
