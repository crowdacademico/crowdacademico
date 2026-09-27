import { Injectable } from '@nestjs/common';
import { excluirOu404ou403 } from '../../commons/database/distinguir-404-ou-403.util';
import { DatabaseService } from '../../commons/database/database.service';

@Injectable()
export class LinkAcademicoServiceRemove {
  constructor(private readonly database: DatabaseService) {}

  async executar(id: number): Promise<void> {
    // pol_link_delete (04): dono OU link_academico_gerenciar.
    await excluirOu404ou403(
      this.database.getDb(),
      'link_academico',
      { id_link_academico: id },
      'Link acadêmico não encontrado.',
      'Sem permissão para excluir este link.',
    );
  }
}
