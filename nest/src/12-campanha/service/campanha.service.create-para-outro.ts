import { ForbiddenException, Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseService } from '../../commons/database/database.service';
import { CampanhaRequestCreate } from '../dto/request/campanha.request-create';
import { CampanhaResponse } from '../dto/response/campanha.response';
import { CampanhaServiceFindOne } from './campanha.service.findone';

// criar_campanha_para_outro() (03_funcoes_seguranca.sql, [03-S]) - mesma
// classe de achado de perfil-pesquisador.service.create-para-outro.ts:
// "Criar campanha" saiu do Campo de Testes em 25-08-2026 (remoção do
// Elenco) - pol_campanha_insert (04) exige id_usuario =
// id_usuario_atual() E pesquisador ativo, então não dava mais pra criar
// em nome de um pesquisador escolhido sem personificação. Endpoint
// separado, gateado por permissão própria (campanha_criar_para_outro,
// dentro da função) - o self-service (CampanhaServiceCreate) continua
// exatamente como estava.
@Injectable()
export class CampanhaServiceCreateParaOutro {
  constructor(
    private readonly database: DatabaseService,
    private readonly findOne: CampanhaServiceFindOne,
  ) {}

  async executar(
    idUsuarioAlvo: number,
    dto: CampanhaRequestCreate,
  ): Promise<CampanhaResponse> {
    let idCampanha: number;
    try {
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
      idCampanha = resultado.rows[0].criar_campanha_para_outro;
    } catch (erro) {
      // A função só levanta RAISE EXCEPTION pra permissão faltando ou
      // pesquisador-alvo não ativo (sem ERRCODE customizado, P0001) -
      // outros erros (trigger de negócio: prazo, meta mínima, limite de
      // campanhas simultâneas) têm ERRCODE próprio e seguem pro
      // PostgresExceptionFilter global.
      if ((erro as { code?: string }).code === 'P0001') {
        throw new ForbiddenException((erro as Error).message);
      }
      throw erro;
    }

    return this.findOne.executar(idCampanha);
  }
}
