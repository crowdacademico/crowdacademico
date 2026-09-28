import { Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseService } from '../../commons/database/database.service';
import { CampanhaRequestCreate } from '../dto/request/campanha.request-create';
import { CampanhaResponse } from '../dto/response/campanha.response';
import { CampanhaServiceFindOne } from './campanha.service.findone';

// criar_campanha_para_outro() (03_funcoes_seguranca.sql, [03-S]): pol_campanha_insert (04) exige id_usuario =
// id_usuario_atual() E pesquisador ativo, então não dá para criar em nome de um pesquisador escolhido sem
// personificação. Endpoint separado, gateado por permissão própria (campanha_criar_para_outro, dentro da
// função); o self-service (CampanhaServiceCreate) não o usa. Mesma classe de
// perfil-pesquisador.service.create-for-other.ts.
@Injectable()
export class CampanhaServiceCreateForOther {
  constructor(
    private readonly database: DatabaseService,
    private readonly findOne: CampanhaServiceFindOne,
  ) {}

  async executar(
    idUsuarioAlvo: number,
    dto: CampanhaRequestCreate,
  ): Promise<CampanhaResponse> {
    const resultado = await sql<{ criar_campanha_para_outro: number }>`
      SELECT public.criar_campanha_para_outro(
        ${idUsuarioAlvo},
        ${dto.idAreaConhecimento},
        ${dto.titulo},
        ${dto.modelo ?? null}::modelo_campanha,
        ${dto.metaFinanceira},
        ${dto.descricao ?? null},
        ${dto.dataInicio ? new Date(dto.dataInicio) : null}::timestamptz,
        ${dto.dataFim ? new Date(dto.dataFim) : null}::timestamptz,
        ${dto.videoApresentacaoUrl ?? null}
      )
    `.execute(this.database.getDb());
    return this.findOne.executar(resultado.rows[0].criar_campanha_para_outro);
  }
}
