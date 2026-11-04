import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import {
  ResultadoPaginado,
  paginar,
} from '../../commons/database/paginacao.util';
import { ATUALIZACAO_CAMPANHA_COLUNAS_SELECT } from '../constants/atualizacao-campanha.constants';
import { AtualizacaoCampanhaConverter } from '../dto/converter/atualizacao-campanha.converter';
import { PorCampanhaQueryDto } from '../../commons/database/dto/por-campanha.query.dto';
import { AtualizacaoCampanhaResponse } from '../dto/response/atualizacao-campanha.response';
import { AnexoAtualizacaoService } from './anexo-atualizacao.service';

// pol_atualizacao_select (04) já filtra ativo=FALSE fora do alcance de
// quem não é dono/moderador - sem checagem extra aqui. Cada atualização vem com os anexos.
@Injectable()
export class AtualizacaoCampanhaServiceFindAll {
  constructor(
    private readonly database: DatabaseService,
    private readonly anexos: AnexoAtualizacaoService,
  ) {}

  async executar(
    filtro: PorCampanhaQueryDto,
  ): Promise<ResultadoPaginado<AtualizacaoCampanhaResponse>> {
    const query = this.database
      .getDb()
      .selectFrom('atualizacao_campanha')
      .select(ATUALIZACAO_CAMPANHA_COLUNAS_SELECT)
      .where('id_campanha', '=', filtro.idCampanha)
      .orderBy('publicado_em', 'desc');

    const resultado = await paginar(query, {
      pagina: filtro.pagina,
      tamanho: filtro.tamanho,
    });
    const anexos = await this.anexos.porAtualizacao(
      resultado.dados.map((linha) => linha.id_atualizacao),
    );

    return {
      ...resultado,
      dados: resultado.dados.map((linha) =>
        AtualizacaoCampanhaConverter.paraResponseDto(
          linha,
          anexos.get(linha.id_atualizacao),
        ),
      ),
    };
  }
}
