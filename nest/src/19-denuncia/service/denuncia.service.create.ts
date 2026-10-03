import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { DenunciaConverter } from '../dto/converter/denuncia.converter';
import { DenunciaRequestCreate } from '../dto/request/denuncia.request-create';
import { DenunciaResponse } from '../dto/response/denuncia.response';
import { consultaDenunciaComDetalhes } from './denuncia.util.with-details';

// Toda denúncia nasce 'pendente' e em nome de quem está logado (pol_denuncia_insert, 04). As regras de alvo,
// motivo, duplicidade e limite por janela são do banco (05).
@Injectable()
export class DenunciaServiceCreate {
  constructor(private readonly database: DatabaseService) {}

  async executar(
    dto: DenunciaRequestCreate,
    idUsuario: number,
  ): Promise<DenunciaResponse> {
    const db = this.database.getDb();
    const { id_denuncia } = await db
      .insertInto('denuncia')
      .values({
        id_usuario: idUsuario,
        id_campanha_alvo: dto.idCampanhaAlvo ?? null,
        id_pesquisador_alvo: dto.idPesquisadorAlvo ?? null,
        id_motivo: dto.idMotivo,
        relato: dto.relato?.trim() ? dto.relato.trim() : null,
      })
      .returning('id_denuncia')
      .executeTakeFirstOrThrow();

    const linha = await consultaDenunciaComDetalhes(db)
      .where('denuncia.id_denuncia', '=', id_denuncia)
      .executeTakeFirstOrThrow();
    return DenunciaConverter.paraResponseDto(linha);
  }
}
