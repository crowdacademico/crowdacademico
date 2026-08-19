import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { AreaConhecimentoConverter } from '../dto/converter/area-conhecimento.converter';
import { AreaConhecimentoRequestUpdate } from '../dto/request/area-conhecimento.request-update';
import { AreaConhecimentoResponse } from '../dto/response/area-conhecimento.response';

@Injectable()
export class AreaConhecimentoServiceUpdate {
  constructor(private readonly database: DatabaseService) {}

  async executar(
    idAreaConhecimento: number,
    dto: AreaConhecimentoRequestUpdate,
  ): Promise<AreaConhecimentoResponse> {
    const db = this.database.getDb();

    const campos = {
      ...(dto.nome !== undefined ? { nome: dto.nome } : {}),
      ...(dto.ativo !== undefined ? { ativo: dto.ativo } : {}),
    };
    if (Object.keys(campos).length === 0) {
      throw new BadRequestException('Nenhum campo para atualizar.');
    }

    const linha = await db
      .updateTable('area_conhecimento')
      .set(campos)
      .where('id_area_conhecimento', '=', idAreaConhecimento)
      .returningAll()
      .executeTakeFirst();

    if (!linha) {
      // pol_area_update (04): exige tem_permissao('area_conhecimento_
      // gerenciar'). 0 linhas afetadas sem erro é a RLS filtrando —
      // diferencia de "não existe" com uma segunda consulta (SELECT já é
      // USING(true), sempre enxerga a linha se ela existir).
      const existe = await db
        .selectFrom('area_conhecimento')
        .select('id_area_conhecimento')
        .where('id_area_conhecimento', '=', idAreaConhecimento)
        .executeTakeFirst();
      if (!existe) {
        throw new NotFoundException(
          `Área de conhecimento ${idAreaConhecimento} não encontrada`,
        );
      }
      throw new ForbiddenException(
        'Sem permissão para editar esta área de conhecimento.',
      );
    }

    return AreaConhecimentoConverter.paraResponseDto(linha);
  }
}
