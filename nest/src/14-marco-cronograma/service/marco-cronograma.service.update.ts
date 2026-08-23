import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { MARCO_CRONOGRAMA_COLUNAS_SELECT } from '../constants/marco-cronograma.constants';
import { MarcoCronogramaConverter } from '../dto/converter/marco-cronograma.converter';
import { MarcoCronogramaRequestUpdate } from '../dto/request/marco-cronograma.request-update';
import { MarcoCronogramaResponse } from '../dto/response/marco-cronograma.response';

@Injectable()
export class MarcoCronogramaServiceUpdate {
  constructor(private readonly database: DatabaseService) {}

  async executar(
    id: number,
    dto: MarcoCronogramaRequestUpdate,
  ): Promise<MarcoCronogramaResponse> {
    const linha = await this.database
      .getDb()
      .updateTable('marco_cronograma')
      .set({
        titulo: dto.titulo,
        descricao: dto.descricao ?? null,
        data_prevista: new Date(dto.dataPrevista),
        ...(dto.ordem !== undefined ? { ordem: dto.ordem } : {}),
      })
      .where('id_marco', '=', id)
      .returning(MARCO_CRONOGRAMA_COLUNAS_SELECT)
      .executeTakeFirst();

    if (!linha) {
      const existe = await this.database
        .getDb()
        .selectFrom('marco_cronograma')
        .select('id_marco')
        .where('id_marco', '=', id)
        .executeTakeFirst();
      if (!existe) {
        throw new NotFoundException('Marco de cronograma não encontrado.');
      }
      throw new ForbiddenException('Sem permissão para editar este marco.');
    }

    return MarcoCronogramaConverter.paraResponseDto(linha);
  }
}
