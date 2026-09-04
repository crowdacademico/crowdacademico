import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { MotivoDenunciaConverter } from '../dto/converter/motivo-denuncia.converter';
import { MotivoDenunciaResponse } from '../dto/response/motivo-denuncia.response';

@Injectable()
export class MotivoDenunciaServiceFindOne {
  constructor(private readonly database: DatabaseService) {}

  async executar(idMotivo: number): Promise<MotivoDenunciaResponse> {
    // pol_motivo_select (04): USING(true) - mesma leitura pública do findall.
    const linha = await this.database
      .getDb()
      .selectFrom('motivo_denuncia')
      .selectAll()
      .where('id_motivo', '=', idMotivo)
      .executeTakeFirst();

    if (!linha) {
      throw new NotFoundException(
        `Motivo de denúncia ${idMotivo} não encontrado`,
      );
    }

    return MotivoDenunciaConverter.paraResponseDto(linha);
  }
}
