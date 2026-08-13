import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { AreaConhecimentoConverter } from '../dto/converter/area-conhecimento.converter';
import { AreaConhecimentoResponseDto } from '../dto/response/area-conhecimento.response.dto';

@Injectable()
export class AreaConhecimentoServiceFindOne {
  constructor(private readonly database: DatabaseService) {}

  async executar(
    idAreaConhecimento: number,
  ): Promise<AreaConhecimentoResponseDto> {
    // pol_area_select (04): USING(true) — mesma leitura pública do findall.
    const linha = await this.database
      .getDb()
      .selectFrom('area_conhecimento as area')
      .leftJoin(
        'area_conhecimento as pai',
        'pai.id_area_conhecimento',
        'area.id_pai',
      )
      .select([
        'area.id_area_conhecimento',
        'area.codigo_cnpq',
        'area.nome',
        'area.id_pai',
        'area.ativo',
        'pai.nome as nome_pai',
      ])
      .where('area.id_area_conhecimento', '=', idAreaConhecimento)
      .executeTakeFirst();

    if (!linha) {
      throw new NotFoundException(
        `Área de conhecimento ${idAreaConhecimento} não encontrada`,
      );
    }

    return AreaConhecimentoConverter.paraResponseDto(linha);
  }
}
