import { Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseService } from '../../commons/database/database.service';
import { DenunciaConverter } from '../dto/converter/denuncia.converter';
import { DenunciaContestacaoRequestDecide } from '../dto/request/denuncia-contestacao.request-decide';
import { DenunciaResponse } from '../dto/response/denuncia.response';
import { consultaDenunciaComDetalhes } from './denuncia.util.with-details';

// decidir_contestacao() (03): a moderação aceita (a denúncia vira improcedente e a nota se recalcula) ou recusa uma
// contestação esperando análise, sempre com justificativa (RF-033). Nunca mexe na nota direto.
@Injectable()
export class DenunciaServiceDecideContest {
  constructor(private readonly database: DatabaseService) {}

  async executar(
    id: number,
    dto: DenunciaContestacaoRequestDecide,
  ): Promise<DenunciaResponse> {
    const db = this.database.getDb();
    await sql`SELECT public.decidir_contestacao(${id}, ${dto.aceitar}, ${dto.justificativa.trim()})`.execute(
      db,
    );
    const linha = await consultaDenunciaComDetalhes(db)
      .where('denuncia.id_denuncia', '=', id)
      .executeTakeFirstOrThrow();
    return DenunciaConverter.paraResponseDto(linha);
  }
}
