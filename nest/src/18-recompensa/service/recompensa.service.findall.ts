import { Inject, Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseService } from '../../commons/database/database.service';
import { ARMAZENAMENTO_SERVICE } from '../../commons/storage/storage.constants';
import type { ArmazenamentoService } from '../../commons/storage/storage.service.interface';
import { RecompensaConverter } from '../dto/converter/recompensa.converter';
import { MuralResponse } from '../dto/response/recompensa.response';

// O Mural dos apoiadores de uma campanha (22-11-2026): a recompensa (uma por campanha, ou nenhuma) e quem está nele.
// Público: a página da campanha mostra para qualquer um. Quem entra é calculado no banco (mural_apoiadores, 05), que
// já tira o nome e a foto de quem apoiou como anônimo e só responde para campanha com página pública.
@Injectable()
export class RecompensaServiceFindAll {
  constructor(
    private readonly database: DatabaseService,
    @Inject(ARMAZENAMENTO_SERVICE)
    private readonly armazenamento: ArmazenamentoService,
  ) {}

  async executar(idCampanha: number): Promise<MuralResponse> {
    const db = this.database.getDb();
    const recompensa = await db
      .selectFrom('recompensa')
      .selectAll()
      .where('id_campanha', '=', idCampanha)
      .executeTakeFirst();
    if (!recompensa) {
      return { recompensa: null, apoiadores: [], travada: false };
    }

    const resultado = await sql<{
      nome: string | null;
      chave_foto: string | null;
      apoiou_em: Date;
    }>`SELECT * FROM public.mural_apoiadores(${idCampanha})`.execute(db);

    return {
      recompensa: RecompensaConverter.paraResponseDto(recompensa),
      apoiadores: resultado.rows.map((linha) => ({
        nome: linha.nome,
        fotoUrl: linha.chave_foto
          ? this.armazenamento.montarUrlPublica(linha.chave_foto)
          : null,
        apoiouEm: linha.apoiou_em,
      })),
      travada: resultado.rows.length > 0,
    };
  }
}
