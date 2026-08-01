import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { PapelResponseDto } from '../dto/response/papel.response.dto';

@Injectable()
export class PapelServiceFindAll {
  constructor(private readonly database: DatabaseService) {}

  async executar(): Promise<PapelResponseDto[]> {
    // pol_papel_select (04_rls_policies.sql) é USING(true) — catálogo
    // público, sem exigir login. Não existe endpoint de criar/editar/excluir
    // papel: a tabela não tem NENHUM GRANT de escrita pro app_nestjs
    // (06_grants.sql) — RBAC é gerenciado direto no banco, nunca pela API,
    // de propósito (evita escalar privilégio criando papel/permissão pela
    // aplicação). Ver "Probleminha-chan.md"/relatório desta rodada.
    const papeis = await this.database
      .getDb()
      .selectFrom('papel')
      .select(['id_papel', 'nome'])
      .orderBy('nome')
      .execute();

    return papeis.map((p) => ({ idPapel: p.id_papel, nome: p.nome }));
  }
}
