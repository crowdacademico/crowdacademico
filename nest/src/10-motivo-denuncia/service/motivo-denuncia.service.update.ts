import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { MotivoDenunciaConverter } from '../dto/converter/motivo-denuncia.converter';
import { MotivoDenunciaRequestUpdate } from '../dto/request/motivo-denuncia.request-update';
import { MotivoDenunciaResponse } from '../dto/response/motivo-denuncia.response';

@Injectable()
export class MotivoDenunciaServiceUpdate {
  constructor(private readonly database: DatabaseService) {}

  async executar(
    idMotivo: number,
    dto: MotivoDenunciaRequestUpdate,
  ): Promise<MotivoDenunciaResponse> {
    const db = this.database.getDb();

    const campos = {
      ...(dto.descricao !== undefined ? { descricao: dto.descricao } : {}),
      ...(dto.tipo !== undefined ? { tipo: dto.tipo } : {}),
      ...(dto.ativo !== undefined ? { ativo: dto.ativo } : {}),
    };
    if (Object.keys(campos).length === 0) {
      throw new BadRequestException('Nenhum campo para atualizar.');
    }

    const linha = await db
      .updateTable('motivo_denuncia')
      .set(campos)
      .where('id_motivo', '=', idMotivo)
      .returningAll()
      .executeTakeFirst();

    if (!linha) {
      // pol_motivo_update (04): exige tem_permissao('motivo_denuncia_
      // gerenciar'). 0 linhas afetadas sem erro é a RLS filtrando -
      // diferencia de "não existe" com uma segunda consulta (SELECT já é
      // USING(true), sempre enxerga a linha se ela existir).
      const existe = await db
        .selectFrom('motivo_denuncia')
        .select('id_motivo')
        .where('id_motivo', '=', idMotivo)
        .executeTakeFirst();
      if (!existe) {
        throw new NotFoundException(
          `Motivo de denúncia ${idMotivo} não encontrado`,
        );
      }
      throw new ForbiddenException(
        'Sem permissão para editar este motivo de denúncia.',
      );
    }

    return MotivoDenunciaConverter.paraResponseDto(linha);
  }
}
