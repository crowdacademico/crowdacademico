import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { RECOMPENSA_COLUNAS_SELECT } from '../constants/recompensa.constants';
import { RecompensaConverter } from '../dto/converter/recompensa.converter';
import { RecompensaRequestCreate } from '../dto/request/recompensa.request-create';
import { RecompensaResponse } from '../dto/response/recompensa.response';

// RF-099 e RF-100, na versão simbólica: reconhecimento, acesso antecipado ou algo digital, com um valor mínimo. Sem
// estoque (quantidade_disponivel fica vazia = ilimitada) e sem entrega. Só o dono da campanha cria
// (pol_recompensa_insert, 04: a RLS recusa os outros); o limite de texto da descrição é do banco
// (trg_recompensa_valida_limite_texto). O link especial é opcional, na mesma transação.
@Injectable()
export class RecompensaServiceCreate {
  constructor(private readonly database: DatabaseService) {}

  async executar(dto: RecompensaRequestCreate): Promise<RecompensaResponse> {
    const db = this.database.getDb();
    const linha = await db
      .insertInto('recompensa')
      .values({
        id_campanha: dto.idCampanha,
        titulo: dto.titulo.trim(),
        descricao: dto.descricao?.trim() || null,
        valor_minimo: dto.valorMinimo.toFixed(2),
        quantidade_disponivel: null,
        tipo: dto.tipo,
      })
      .returning(RECOMPENSA_COLUNAS_SELECT)
      .executeTakeFirstOrThrow();

    const links = dto.link
      ? [
          await db
            .insertInto('link_recompensa')
            .values({
              id_recompensa: linha.id_recompensa,
              id_tipolink: dto.link.idTipoLink,
              url: dto.link.url,
              ordem: 0,
            })
            .returningAll()
            .executeTakeFirstOrThrow(),
        ]
      : [];

    return RecompensaConverter.paraResponseDto(linha, 0, links);
  }
}
