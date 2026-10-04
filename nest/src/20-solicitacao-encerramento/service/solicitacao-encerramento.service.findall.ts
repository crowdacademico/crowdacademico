import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import {
  ResultadoPaginado,
  paginar,
} from '../../commons/database/paginacao.util';
import { SolicitacaoEncerramentoConverter } from '../dto/converter/solicitacao-encerramento.converter';
import { SolicitacaoEncerramentoRequestList } from '../dto/request/solicitacao-encerramento.request-list';
import { SolicitacaoEncerramentoResponse } from '../dto/response/solicitacao-encerramento.response';
import { consultaSolicitacaoComDetalhes } from './solicitacao-encerramento.util.with-details';

// pol_solicitacao_select (04): quem decide vê todos; o dono, os das próprias campanhas. Mais recentes primeiro.
@Injectable()
export class SolicitacaoEncerramentoServiceFindAll {
  constructor(private readonly database: DatabaseService) {}

  async executar(
    filtro: SolicitacaoEncerramentoRequestList,
  ): Promise<ResultadoPaginado<SolicitacaoEncerramentoResponse>> {
    let query = consultaSolicitacaoComDetalhes(this.database.getDb());
    if (filtro.status) {
      query = query.where(
        'solicitacao_encerramento.status',
        '=',
        filtro.status,
      );
    }
    if (filtro.idCampanha !== undefined) {
      query = query.where(
        'solicitacao_encerramento.id_campanha',
        '=',
        filtro.idCampanha,
      );
    }
    const resultado = await paginar(
      query.orderBy('solicitacao_encerramento.solicitado_em', 'desc'),
      {
        pagina: filtro.pagina,
        tamanho: filtro.tamanho,
      },
    );
    return {
      ...resultado,
      dados: resultado.dados.map((linha) =>
        SolicitacaoEncerramentoConverter.paraResponseDto(linha),
      ),
    };
  }
}
