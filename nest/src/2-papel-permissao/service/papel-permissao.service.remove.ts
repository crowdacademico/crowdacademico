import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { excluirOu404ou403 } from '../../commons/database/distinguir-404-ou-403.util';

@Injectable()
export class PapelPermissaoServiceRemove {
  constructor(private readonly database: DatabaseService) {}

  async executar(idPapel: number, idPermissao: number): Promise<void> {
    // pol_papelperm_delete (04) exige tem_permissao('papel_gerenciar'): sem ela a RLS esconde a linha e a resposta é 403.
    await excluirOu404ou403(
      this.database.getDb(),
      'papel_permissao',
      { id_papel: idPapel, id_permissao: idPermissao },
      'Este papel não tem esta permissão.',
      "Sem permissão 'papel_gerenciar' para revogar permissões.",
    );
  }
}
