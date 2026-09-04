import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { CAMPANHA_COLUNAS_SELECT } from '../constants/campanha.constants';
import { CampanhaConverter } from '../dto/converter/campanha.converter';
import { CampanhaRequestCreate } from '../dto/request/campanha.request-create';
import { CampanhaResponse } from '../dto/response/campanha.response';

// Nenhuma validação de negócio duplicada aqui de propósito - tudo já é
// trigger no banco (05_regras_negocio.sql, [05-K-2]): prazo (15-60 dias,
// configurável), meta mínima, limite de 2 campanhas simultâneas por
// pesquisador, pesquisador precisa estar com status_pesquisador='ativo'
// (RLS, pol_campanha_insert). O PostgresExceptionFilter global já traduz
// os ERRCODEs 90xxx/91xxx/92xxx pra 400/403 com a mensagem original da
// função - duplicar aqui só arriscaria divergir com o tempo.
//
// `modelo` só entra no INSERT se vier no DTO - a coluna é NOT NULL com
// DEFAULT 'all-or-nothing' (01_extensoes_enums_tabelas.sql, [01-E]);
// mandar `null` explícito violaria a constraint, então omitir a chave
// (em vez de `?? null`, padrão usado nas colunas nullable abaixo) é o
// jeito certo de deixar o banco aplicar o próprio default.
@Injectable()
export class CampanhaServiceCreate {
  constructor(private readonly database: DatabaseService) {}

  async executar(
    dto: CampanhaRequestCreate,
    idUsuario: number,
  ): Promise<CampanhaResponse> {
    const linha = await this.database
      .getDb()
      .insertInto('campanha')
      .values({
        id_usuario: idUsuario,
        id_area_conhecimento: dto.idAreaConhecimento,
        titulo: dto.titulo,
        ...(dto.modelo ? { modelo: dto.modelo } : {}),
        meta_financeira: dto.metaFinanceira.toString(),
        descricao: dto.descricao ?? null,
        data_inicio: dto.dataInicio ? new Date(dto.dataInicio) : null,
        data_fim: dto.dataFim ? new Date(dto.dataFim) : null,
        video_apresentacao_url: dto.videoApresentacaoUrl ?? null,
      })
      .returning(CAMPANHA_COLUNAS_SELECT)
      .executeTakeFirstOrThrow();

    return CampanhaConverter.paraResponseDto(linha);
  }
}
