import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { excluirOu404ou403 } from '../../commons/database/distinguir-404-ou-403.util';

@Injectable()
export class UsuarioPapelServiceRemove {
  constructor(private readonly database: DatabaseService) {}

  async executar(idUsuario: number, idPapel: number): Promise<void> {
    // pol_usuariopapel_delete (04) exige tem_permissao('papel_gerenciar'): sem ela a RLS esconde a linha e a resposta é 403.
    await excluirOu404ou403(
      this.database.getDb(),
      'usuario_papel',
      { id_usuario: idUsuario, id_papel: idPapel },
      'Este usuário não tem este papel.',
      "Sem permissão 'papel_gerenciar' para remover papéis de outros usuários.",
    );
  }
}
