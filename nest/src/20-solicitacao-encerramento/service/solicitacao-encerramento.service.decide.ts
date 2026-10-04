import { Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseService } from '../../commons/database/database.service';
import { SolicitacaoEncerramentoConverter } from '../dto/converter/solicitacao-encerramento.converter';
import { SolicitacaoEncerramentoRequestDecide } from '../dto/request/solicitacao-encerramento.request-decide';
import { SolicitacaoEncerramentoResponse } from '../dto/response/solicitacao-encerramento.response';
import { consultaSolicitacaoComDetalhes } from './solicitacao-encerramento.util.with-details';

// decidir_solicitacao_encerramento() (03): aprova (e encerra a campanha) ou rejeita (com justificativa) um pedido
// pendente, gravando quem decidiu e quando (RF-065, RF-066).
@Injectable()
export class SolicitacaoEncerramentoServiceDecide {
  constructor(private readonly database: DatabaseService) {}

  async executar(
    id: number,
    dto: SolicitacaoEncerramentoRequestDecide,
  ): Promise<SolicitacaoEncerramentoResponse> {
    const db = this.database.getDb();
    await sql`SELECT public.decidir_solicitacao_encerramento(${id}, ${dto.aprovar}, ${dto.justificativa?.trim() ?? null})`.execute(
      db,
    );
    const linha = await consultaSolicitacaoComDetalhes(db)
      .where('solicitacao_encerramento.id_solicitacao_encerramento', '=', id)
      .executeTakeFirstOrThrow();
    return SolicitacaoEncerramentoConverter.paraResponseDto(linha);
  }
}
