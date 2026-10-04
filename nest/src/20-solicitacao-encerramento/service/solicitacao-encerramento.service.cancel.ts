import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { distinguir404ou403 } from '../../commons/database/distinguir-404-ou-403.util';
import { SolicitacaoEncerramentoConverter } from '../dto/converter/solicitacao-encerramento.converter';
import { SolicitacaoEncerramentoResponse } from '../dto/response/solicitacao-encerramento.response';
import { consultaSolicitacaoComDetalhes } from './solicitacao-encerramento.util.with-details';

// O dono desiste do pedido enquanto está pendente (RF-064); a campanha segue ativa. O banco só deixa o dono ir de
// pendente para cancelado (fn_valida_transicao_solicitacao, 05).
@Injectable()
export class SolicitacaoEncerramentoServiceCancel {
  constructor(private readonly database: DatabaseService) {}

  async executar(id: number): Promise<SolicitacaoEncerramentoResponse> {
    const db = this.database.getDb();
    const linha = await db
      .updateTable('solicitacao_encerramento')
      .set({ status: 'cancelado' })
      .where('id_solicitacao_encerramento', '=', id)
      .returning('id_solicitacao_encerramento')
      .executeTakeFirst();
    if (!linha) {
      return distinguir404ou403(
        db,
        'solicitacao_encerramento',
        { id_solicitacao_encerramento: id },
        'Pedido de encerramento não encontrado.',
        'Só o dono da campanha cancela o pedido.',
      );
    }
    const atualizada = await consultaSolicitacaoComDetalhes(db)
      .where('solicitacao_encerramento.id_solicitacao_encerramento', '=', id)
      .executeTakeFirstOrThrow();
    return SolicitacaoEncerramentoConverter.paraResponseDto(atualizada);
  }
}
