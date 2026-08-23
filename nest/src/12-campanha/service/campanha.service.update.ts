import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { CAMPANHA_COLUNAS_SELECT } from '../constants/campanha.constants';
import { CampanhaConverter } from '../dto/converter/campanha.converter';
import { CampanhaRequestUpdate } from '../dto/request/campanha.request-update';
import { CampanhaResponse } from '../dto/response/campanha.response';

@Injectable()
export class CampanhaServiceUpdate {
  constructor(private readonly database: DatabaseService) {}

  async executar(
    id: number,
    dto: CampanhaRequestUpdate,
  ): Promise<CampanhaResponse> {
    const linha = await this.database
      .getDb()
      .updateTable('campanha')
      .set({
        ...(dto.titulo !== undefined ? { titulo: dto.titulo } : {}),
        ...(dto.idAreaConhecimento !== undefined
          ? { id_area_conhecimento: dto.idAreaConhecimento }
          : {}),
        ...(dto.metaFinanceira !== undefined
          ? { meta_financeira: dto.metaFinanceira.toString() }
          : {}),
        ...(dto.descricao !== undefined ? { descricao: dto.descricao } : {}),
        ...(dto.dataInicio !== undefined
          ? { data_inicio: new Date(dto.dataInicio) }
          : {}),
        ...(dto.dataFim !== undefined
          ? { data_fim: new Date(dto.dataFim) }
          : {}),
        ...(dto.videoApresentacaoUrl !== undefined
          ? { video_apresentacao_url: dto.videoApresentacaoUrl }
          : {}),
      })
      .where('id_campanha', '=', id)
      .returning(CAMPANHA_COLUNAS_SELECT)
      .executeTakeFirst();

    if (!linha) {
      // pol_campanha_update (04): dono OU campanha_editar/campanha_aprovar/
      // campanha_rejeitar. A existência é conferida pela MESMA sessão, então
      // uma campanha ainda invisível pra quem pediu (fora do alcance de
      // pol_campanha_select também) devolve 404 aqui — não vaza que existe.
      const existe = await this.database
        .getDb()
        .selectFrom('campanha')
        .select('id_campanha')
        .where('id_campanha', '=', id)
        .executeTakeFirst();
      if (!existe) {
        throw new NotFoundException('Campanha não encontrada.');
      }
      throw new ForbiddenException('Sem permissão para editar esta campanha.');
    }

    return CampanhaConverter.paraResponseDto(linha);
  }
}
