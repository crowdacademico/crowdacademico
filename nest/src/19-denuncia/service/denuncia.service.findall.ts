import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import {
  ResultadoPaginado,
  paginar,
} from '../../commons/database/paginacao.util';
import { DenunciaConverter } from '../dto/converter/denuncia.converter';
import { DenunciaRequestList } from '../dto/request/denuncia.request-list';
import { DenunciaResponse } from '../dto/response/denuncia.response';
import { consultaDenunciaComDetalhes } from './denuncia.util.with-details';

// pol_denuncia_select (04): quem tem denuncia_responder vê todas; os outros, só as próprias. Mais recentes primeiro.
@Injectable()
export class DenunciaServiceFindAll {
  constructor(private readonly database: DatabaseService) {}

  async executar(
    filtro: DenunciaRequestList,
  ): Promise<ResultadoPaginado<DenunciaResponse>> {
    let query = consultaDenunciaComDetalhes(this.database.getDb());
    if (filtro.tipo === 'campanha') {
      query = query.where('denuncia.id_campanha_alvo', 'is not', null);
    }
    if (filtro.tipo === 'perfil') {
      query = query.where('denuncia.id_pesquisador_alvo', 'is not', null);
    }
    if (filtro.status) {
      query = query.where('denuncia.status', '=', filtro.status);
    }
    if (filtro.idCampanha !== undefined) {
      query = query.where('denuncia.id_campanha_alvo', '=', filtro.idCampanha);
    }
    if (filtro.idPesquisador !== undefined) {
      query = query.where(
        'denuncia.id_pesquisador_alvo',
        '=',
        filtro.idPesquisador,
      );
    }

    const resultado = await paginar(
      query.orderBy('denuncia.criado_em', 'desc'),
      { pagina: filtro.pagina, tamanho: filtro.tamanho },
    );
    return {
      ...resultado,
      dados: resultado.dados.map((linha) =>
        DenunciaConverter.paraResponseDto(linha),
      ),
    };
  }
}
