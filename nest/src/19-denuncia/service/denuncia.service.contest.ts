import { Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseService } from '../../commons/database/database.service';
import { DenunciaContestacaoRequestCreate } from '../dto/request/denuncia-contestacao.request-create';

// contestar_denuncia() (03): o pesquisador penalizado contesta uma denúncia procedente (RF-033). O banco recusa quem
// não é o penalizado (92034), sem texto (90032), denúncia não procedente (91044) ou já contestada (91045), e uma
// segunda contestação esperando análise (91046).
@Injectable()
export class DenunciaServiceContest {
  constructor(private readonly database: DatabaseService) {}

  async executar(
    id: number,
    dto: DenunciaContestacaoRequestCreate,
  ): Promise<void> {
    await sql`SELECT public.contestar_denuncia(${id}, ${dto.texto.trim()})`.execute(
      this.database.getDb(),
    );
  }
}
