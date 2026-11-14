import { Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseService } from '../../commons/database/database.service';

// POST /contribuicao/:idContribuicao/desistir. Toda a regra (dono, contribuição paga, prazo de
// desistencia_prazo_dias, repasse ainda pendente) é de desistir_contribuicao() (05, [05-K-2]); os códigos 92042,
// 91059, 91060 e 91061 são traduzidos pelo PostgresExceptionFilter. A contribuição vai para a_devolver: o worker de
// estorno devolve o valor e o repasse pendente desconta sozinho.
@Injectable()
export class ContribuicaoServiceWithdraw {
  constructor(private readonly database: DatabaseService) {}

  async executar(idContribuicao: number): Promise<void> {
    await sql`SELECT public.desistir_contribuicao(${idContribuicao}::int)`.execute(
      this.database.getDb(),
    );
  }
}
