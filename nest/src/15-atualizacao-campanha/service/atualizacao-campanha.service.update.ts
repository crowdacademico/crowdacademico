import { BadRequestException, Injectable } from '@nestjs/common';
import { distinguir404ou403 } from '../../commons/database/distinguir-404-ou-403.util';
import { DatabaseService } from '../../commons/database/database.service';
import { ATUALIZACAO_CAMPANHA_COLUNAS_SELECT } from '../constants/atualizacao-campanha.constants';
import { AtualizacaoCampanhaConverter } from '../dto/converter/atualizacao-campanha.converter';
import { AtualizacaoCampanhaRequestUpdate } from '../dto/request/atualizacao-campanha.request-update';
import { AtualizacaoCampanhaResponse } from '../dto/response/atualizacao-campanha.response';

@Injectable()
export class AtualizacaoCampanhaServiceUpdate {
  constructor(private readonly database: DatabaseService) {}

  async executar(
    id: number,
    dto: AtualizacaoCampanhaRequestUpdate,
  ): Promise<AtualizacaoCampanhaResponse> {
    const campos = {
      ...(dto.titulo !== undefined ? { titulo: dto.titulo } : {}),
      ...(dto.conteudo !== undefined ? { conteudo: dto.conteudo } : {}),
      ...(dto.fase !== undefined ? { fase: dto.fase } : {}),
      ...(dto.tipo !== undefined ? { tipo: dto.tipo } : {}),
      ...(dto.ativo !== undefined ? { ativo: dto.ativo } : {}),
    };
    if (Object.keys(campos).length === 0) {
      // `UPDATE ... SET WHERE` sem coluna é SQL inválido: 400 claro em vez do 500 do Postgres.
      throw new BadRequestException('Nenhum campo para atualizar.');
    }

    const linha = await this.database
      .getDb()
      .updateTable('atualizacao_campanha')
      .set(campos)
      .where('id_atualizacao', '=', id)
      .returning(ATUALIZACAO_CAMPANHA_COLUNAS_SELECT)
      .executeTakeFirst();

    if (!linha) {
      // pol_atualizacao_update (04): dono da campanha OU atualizacao_moderar.
      return await distinguir404ou403(
        this.database.getDb(),
        'atualizacao_campanha',
        { id_atualizacao: id },
        'Atualização de campanha não encontrada.',
        'Sem permissão para editar esta atualização.',
      );
    }

    return AtualizacaoCampanhaConverter.paraResponseDto(linha);
  }
}
