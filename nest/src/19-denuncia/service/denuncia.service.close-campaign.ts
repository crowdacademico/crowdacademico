import { Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseService } from '../../commons/database/database.service';
import { DenunciaConverter } from '../dto/converter/denuncia.converter';
import { DenunciaRequestCloseCampaign } from '../dto/request/denuncia.request-close-campaign';
import { DenunciaResponse } from '../dto/response/denuncia.response';
import { consultaDenunciaComDetalhes } from './denuncia.util.with-details';

// encerrar_campanha_por_denuncia() (03): julga a denúncia procedente e encerra a campanha por moderação, as duas
// coisas juntas (RF-114). Confere as permissões e as regras no banco; a campanha some da página pública pela
// própria RLS (encerrado_moderacao não é status público).
@Injectable()
export class DenunciaServiceCloseCampaign {
  constructor(private readonly database: DatabaseService) {}

  async executar(
    id: number,
    dto: DenunciaRequestCloseCampaign,
  ): Promise<DenunciaResponse> {
    const db = this.database.getDb();
    await sql`SELECT public.encerrar_campanha_por_denuncia(${id}, ${dto.justificativa.trim()})`.execute(
      db,
    );
    const linha = await consultaDenunciaComDetalhes(db)
      .where('denuncia.id_denuncia', '=', id)
      .executeTakeFirstOrThrow();
    return DenunciaConverter.paraResponseDto(linha);
  }
}
