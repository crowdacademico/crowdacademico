import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { ORCAMENTO_CAMPANHA_COLUNAS_SELECT } from '../constants/orcamento-campanha.constants';
import { OrcamentoCampanhaConverter } from '../dto/converter/orcamento-campanha.converter';
import { OrcamentoCampanhaRequestUpdate } from '../dto/request/orcamento-campanha.request-update';
import { OrcamentoCampanhaResponse } from '../dto/response/orcamento-campanha.response';

@Injectable()
export class OrcamentoCampanhaServiceUpdate {
  constructor(private readonly database: DatabaseService) {}

  async executar(
    id: number,
    dto: OrcamentoCampanhaRequestUpdate,
  ): Promise<OrcamentoCampanhaResponse> {
    const linha = await this.database
      .getDb()
      .updateTable('orcamento_campanha')
      .set({
        categoria: dto.categoria,
        descricao: dto.descricao ?? null,
        valor: dto.valor.toString(),
        ...(dto.ordem !== undefined ? { ordem: dto.ordem } : {}),
      })
      .where('id_orcamento', '=', id)
      .returning(ORCAMENTO_CAMPANHA_COLUNAS_SELECT)
      .executeTakeFirst();

    if (!linha) {
      // pol_orcamento_campanha_update (04): dono da campanha OU
      // campanha_editar.
      const existe = await this.database
        .getDb()
        .selectFrom('orcamento_campanha')
        .select('id_orcamento')
        .where('id_orcamento', '=', id)
        .executeTakeFirst();
      if (!existe) {
        throw new NotFoundException('Item de orçamento não encontrado.');
      }
      throw new ForbiddenException(
        'Sem permissão para editar este item de orçamento.',
      );
    }

    return OrcamentoCampanhaConverter.paraResponseDto(linha);
  }
}
