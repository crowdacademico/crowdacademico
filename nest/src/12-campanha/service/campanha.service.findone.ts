import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { CAMPANHA_COLUNAS_SELECT } from '../constants/campanha.constants';
import { CampanhaConverter } from '../dto/converter/campanha.converter';
import { CampanhaResponse } from '../dto/response/campanha.response';

@Injectable()
export class CampanhaServiceFindOne {
  constructor(private readonly database: DatabaseService) {}

  async executar(id: number): Promise<CampanhaResponse> {
    const linha = await this.database
      .getDb()
      .selectFrom('campanha')
      .select(CAMPANHA_COLUNAS_SELECT)
      .where('id_campanha', '=', id)
      .executeTakeFirst();

    // pol_campanha_select (04) já filtra campanha 'aguardando_aprovacao'/
    // 'rejeitado'/'encerrado_moderacao' fora do alcance de quem não é dono
    // nem tem relatorio_visualizar - "não encontrada" cobre tanto o caso
    // de não existir quanto o de existir mas estar fora da visão de quem
    // pediu (não vaza a existência de campanha ainda não aprovada).
    if (!linha) {
      throw new NotFoundException('Campanha não encontrada.');
    }

    return CampanhaConverter.paraResponseDto(linha);
  }
}
