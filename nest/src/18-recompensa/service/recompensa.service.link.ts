import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { RecompensaConverter } from '../dto/converter/recompensa.converter';
import { RecompensaRequestLink } from '../dto/request/recompensa.request-create';
import { RecompensaLinkResponse } from '../dto/response/recompensa.response';

// O link especial da recompensa. A RLS de link_recompensa (04) só deixa o dono da campanha (ou admin) incluir e
// apagar; o tipo de link precisa permitir recompensa (trg_link_recompensa_valida_tipo, 05).
@Injectable()
export class RecompensaServiceLink {
  constructor(private readonly database: DatabaseService) {}

  async incluir(
    idRecompensa: number,
    dto: RecompensaRequestLink,
  ): Promise<RecompensaLinkResponse> {
    const linha = await this.database
      .getDb()
      .insertInto('link_recompensa')
      .values({
        id_recompensa: idRecompensa,
        id_tipolink: dto.idTipoLink,
        url: dto.url,
        ordem: 0,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    return RecompensaConverter.paraLink(linha);
  }

  async remover(idLinkRecompensa: number): Promise<void> {
    const resultado = await this.database
      .getDb()
      .deleteFrom('link_recompensa')
      .where('id_link_recompensa', '=', idLinkRecompensa)
      .executeTakeFirst();
    if (resultado.numDeletedRows === 0n) {
      throw new NotFoundException('Link não encontrado, ou não é seu.');
    }
  }
}
