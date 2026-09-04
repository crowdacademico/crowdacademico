import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { PapelPermissaoResponse } from '../dto/response/papel-permissao.response';

@Injectable()
export class PapelPermissaoServiceFindAll {
  constructor(private readonly database: DatabaseService) {}

  async executar(): Promise<PapelPermissaoResponse[]> {
    // pol_papelperm_select - USING(true), público. Join só pra devolver os
    // nomes junto (a tela de devtools do React não precisa fazer 3
    // requisições e cruzar id na mão).
    const linhas = await this.database
      .getDb()
      .selectFrom('papel_permissao')
      .innerJoin('papel', 'papel.id_papel', 'papel_permissao.id_papel')
      .innerJoin(
        'permissao',
        'permissao.id_permissao',
        'papel_permissao.id_permissao',
      )
      .select([
        'papel_permissao.id_papel',
        'papel.nome as nomePapel',
        'papel_permissao.id_permissao',
        'permissao.nome as nomePermissao',
      ])
      .orderBy('papel.nome')
      .orderBy('permissao.nome')
      .execute();

    return linhas.map((l) => ({
      idPapel: l.id_papel,
      nomePapel: l.nomePapel,
      idPermissao: l.id_permissao,
      nomePermissao: l.nomePermissao,
    }));
  }
}
