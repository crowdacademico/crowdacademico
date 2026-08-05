import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { UsuarioPapelResponseDto } from '../dto/response/usuario-papel.response.dto';

@Injectable()
export class UsuarioPapelServiceFindAllGeral {
  constructor(private readonly database: DatabaseService) {}

  // Sem filtro de id_usuario — pedido do Lucas (03-08-2026): coluna "papel"
  // na listagem de Usuários precisa do vínculo de TODO MUNDO de uma vez,
  // não um por vez (evita a listagem disparar N requisições, uma por
  // linha). pol_usuariopapel_select (04) já resolve sozinha quem vê o
  // quê: id_usuario_atual() = dono OU tem_permissao('papel_gerenciar') —
  // admin (quem acessa a listagem) vê tudo; qualquer outra sessão só
  // veria a própria linha, sem precisar filtrar nada aqui.
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
