import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { TipoLinkConverter } from '../dto/converter/tipo-link.converter';
import { TipoLinkResponse } from '../dto/response/tipo-link.response';

@Injectable()
export class TipoLinkServiceFindOne {
  constructor(private readonly database: DatabaseService) {}

  async executar(idTipolink: number): Promise<TipoLinkResponse> {
    // pol_tipolink_select (04): USING(true) — mesma leitura pública do findall.
    const linha = await this.database
      .getDb()
      .selectFrom('tipo_link')
      .selectAll()
      .where('id_tipolink', '=', idTipolink)
      .executeTakeFirst();

    if (!linha) {
      throw new NotFoundException(`Tipo de link ${idTipolink} não encontrado`);
    }

    return TipoLinkConverter.paraResponseDto(linha);
  }
}
