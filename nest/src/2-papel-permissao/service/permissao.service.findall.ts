import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { PermissaoResponse } from '../dto/response/permissao.response';

@Injectable()
export class PermissaoServiceFindAll {
  constructor(private readonly database: DatabaseService) {}

  async executar(): Promise<PermissaoResponse[]> {
    // pol_permissao_select - mesmo raciocínio de PapelServiceFindAll: só
    // leitura, catálogo mantido direto no banco.
    const permissoes = await this.database
      .getDb()
      .selectFrom('permissao')
      .select(['id_permissao', 'nome'])
      .orderBy('id_permissao')
      .execute();

    return permissoes.map((p) => ({
      idPermissao: p.id_permissao,
      nome: p.nome,
    }));
  }
}
