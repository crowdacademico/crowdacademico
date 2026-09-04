import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { CAMPANHA_COLUNAS_SELECT } from '../constants/campanha.constants';
import { CampanhaConverter } from '../dto/converter/campanha.converter';
import { CampanhaRequestRejeitar } from '../dto/request/campanha.request-rejeitar';
import { CampanhaResponse } from '../dto/response/campanha.response';

// Dois writes (UPDATE campanha + INSERT historico_rejeicao) na mesma
// transação por requisição (GlobalDbInterceptor, ver commons/database) -
// nenhum dos dois precisa de `db.transaction()` manual aqui. campanha não
// tem coluna de motivo de rejeição; o texto mora só em historico_rejeicao
// (01_extensoes_enums_tabelas.sql, [01-E]), por isso os dois writes.
// Mesma proteção de aprovar.ts: trg_campanha_valida_transicao (05) só
// deixa a mudança de status passar pra quem tem campanha_rejeitar.
@Injectable()
export class CampanhaServiceRejeitar {
  constructor(private readonly database: DatabaseService) {}

  async executar(
    id: number,
    idAdmin: number,
    dto: CampanhaRequestRejeitar,
  ): Promise<CampanhaResponse> {
    const linha = await this.database
      .getDb()
      .updateTable('campanha')
      .set({
        status: 'rejeitado',
        id_admin: idAdmin,
      })
      .where('id_campanha', '=', id)
      .returning(CAMPANHA_COLUNAS_SELECT)
      .executeTakeFirst();

    if (!linha) {
      const existe = await this.database
        .getDb()
        .selectFrom('campanha')
        .select('id_campanha')
        .where('id_campanha', '=', id)
        .executeTakeFirst();
      if (!existe) {
        throw new NotFoundException('Campanha não encontrada.');
      }
      throw new ForbiddenException(
        'Sem permissão para rejeitar esta campanha.',
      );
    }

    await this.database
      .getDb()
      .insertInto('historico_rejeicao')
      .values({
        id_campanha: id,
        id_admin: idAdmin,
        justificativa: dto.justificativa ?? null,
      })
      .execute();

    return CampanhaConverter.paraResponseDto(linha);
  }
}
