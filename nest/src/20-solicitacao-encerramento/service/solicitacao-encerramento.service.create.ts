import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { SolicitacaoEncerramentoConverter } from '../dto/converter/solicitacao-encerramento.converter';
import { SolicitacaoEncerramentoRequestCreate } from '../dto/request/solicitacao-encerramento.request-create';
import { SolicitacaoEncerramentoResponse } from '../dto/response/solicitacao-encerramento.response';
import { consultaSolicitacaoComDetalhes } from './solicitacao-encerramento.util.with-details';

// Pedido ao administrador (RF-064): nasce pendente. Só o dono (pol_solicitacao_insert), só campanha ativa e com
// justificativa (trg_solicitacao_valida_criacao), um pendente por vez (uq_solicitacao_encerramento_pendente).
@Injectable()
export class SolicitacaoEncerramentoServiceCreate {
  constructor(private readonly database: DatabaseService) {}

  async executar(
    dto: SolicitacaoEncerramentoRequestCreate,
  ): Promise<SolicitacaoEncerramentoResponse> {
    const db = this.database.getDb();
    const { id_solicitacao_encerramento } = await db
      .insertInto('solicitacao_encerramento')
      .values({
        id_campanha: dto.idCampanha,
        justificativa_pesquisador: dto.justificativa.trim(),
      })
      .returning('id_solicitacao_encerramento')
      .executeTakeFirstOrThrow();
    const linha = await consultaSolicitacaoComDetalhes(db)
      .where(
        'solicitacao_encerramento.id_solicitacao_encerramento',
        '=',
        id_solicitacao_encerramento,
      )
      .executeTakeFirstOrThrow();
    return SolicitacaoEncerramentoConverter.paraResponseDto(linha);
  }
}
