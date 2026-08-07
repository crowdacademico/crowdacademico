import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { PapelResponseDto } from '../dto/response/papel.response.dto';

@Injectable()
export class PapelServiceFindAll {
  constructor(private readonly database: DatabaseService) {}

  async executar(): Promise<PapelResponseDto[]> {
    // pol_papel_select (04_rls_policies.sql) é USING(true) — catálogo
    // público, sem exigir login. Não existe endpoint de criar/excluir papel
    // (só UPDATE de `nome`, ver pol_papel_update/PapelServiceUpdate): RBAC
    // continua sendo gerenciado direto no banco, nunca pela API, de
    // propósito (evita escalar privilégio criando papel/permissão pela
    // aplicação). Ordenado por id_papel (não por nome) porque o seed
    // (07_seed_dados.sql [07-B-1]) insere os papéis já em ordem de poder —
    // ordenar por nome esconderia isso.
    const papeis = await this.database
      .getDb()
      .selectFrom('papel')
      .select(['id_papel', 'nome'])
      .orderBy('id_papel')
      .execute();

    return papeis.map((p) => ({ idPapel: p.id_papel, nome: p.nome }));
  }
}
