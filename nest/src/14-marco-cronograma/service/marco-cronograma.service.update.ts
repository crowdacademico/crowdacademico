import { Injectable } from '@nestjs/common';
import { distinguir404ou403 } from '../../commons/database/distinguir-404-ou-403.util';
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
      return await distinguir404ou403(
        this.database.getDb(),
        'marco_cronograma',
        { id_marco: id },
        'Marco de cronograma não encontrado.',
        'Sem permissão para editar este marco.',
      );
    }

    return MarcoCronogramaConverter.paraResponseDto(linha);
  }
}
