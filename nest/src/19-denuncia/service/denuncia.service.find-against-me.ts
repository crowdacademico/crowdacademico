import { Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseService } from '../../commons/database/database.service';
import type {
  StatusContestacao,
  StatusDenuncia,
} from '../../commons/database/db.types';
import { DenunciaContraMimResponse } from '../dto/response/denuncia-contra-mim.response';

// denuncias_contra_mim() (03): as denúncias procedentes contra o pesquisador logado e as já contestadas (RF-033).
// A função nunca devolve quem denunciou; o pesquisador não lê a tabela de denúncia direto (pol_denuncia_select, 04).
@Injectable()
export class DenunciaServiceFindAgainstMe {
  constructor(private readonly database: DatabaseService) {}

  async executar(): Promise<DenunciaContraMimResponse[]> {
    const resultado = await sql<{
      id_denuncia: number;
      id_campanha_alvo: number | null;
      titulo_campanha: string | null;
      motivo: string;
      status: StatusDenuncia;
      justificativa_moderacao: string | null;
      criado_em: Date;
      contestacao: string | null;
      contestacao_status: StatusContestacao | null;
      contestada_em: Date | null;
      justificativa_contestacao: string | null;
    }>`SELECT * FROM public.denuncias_contra_mim()`.execute(
      this.database.getDb(),
    );
    return resultado.rows.map((linha) => ({
      idDenuncia: linha.id_denuncia,
      idCampanhaAlvo: linha.id_campanha_alvo,
      tituloCampanha: linha.titulo_campanha,
      motivo: linha.motivo,
      status: linha.status,
      justificativaModeracao: linha.justificativa_moderacao,
      criadoEm: linha.criado_em,
      contestacao: linha.contestacao,
      contestacaoStatus: linha.contestacao_status,
      contestadaEm: linha.contestada_em,
      justificativaContestacao: linha.justificativa_contestacao,
    }));
  }
}
