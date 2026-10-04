import { Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseService } from '../../commons/database/database.service';
import { SolicitacaoEncerramentoConverter } from '../dto/converter/solicitacao-encerramento.converter';
import { SolicitacaoEncerramentoRequestCreate } from '../dto/request/solicitacao-encerramento.request-create';
import { SolicitacaoEncerramentoResponse } from '../dto/response/solicitacao-encerramento.response';
import { consultaSolicitacaoComDetalhes } from './solicitacao-encerramento.util.with-details';

// Encerrar direto, sem administrador (RF-064): só o dono, só sem contribuição confirmada e sem Pix pendente válido.
// encerrar_campanha_sem_contribuicao() (03) grava o pedido já aprovado (sem admin) e encerra a campanha.
@Injectable()
export class SolicitacaoEncerramentoServiceCloseDirect {
  constructor(private readonly database: DatabaseService) {}

  async executar(
    dto: SolicitacaoEncerramentoRequestCreate,
  ): Promise<SolicitacaoEncerramentoResponse> {
    const db = this.database.getDb();
    const resultado = await sql<{
      id: number;
    }>`SELECT public.encerrar_campanha_sem_contribuicao(${dto.idCampanha}, ${dto.justificativa.trim()}) AS id`.execute(
      db,
    );
    const linha = await consultaSolicitacaoComDetalhes(db)
      .where(
        'solicitacao_encerramento.id_solicitacao_encerramento',
        '=',
        resultado.rows[0].id,
      )
      .executeTakeFirstOrThrow();
    return SolicitacaoEncerramentoConverter.paraResponseDto(linha);
  }
}
