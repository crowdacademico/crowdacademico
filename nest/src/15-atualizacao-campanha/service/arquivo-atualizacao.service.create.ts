import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { ARQUIVO_ATUALIZACAO_COLUNAS_SELECT } from '../constants/arquivo-atualizacao.constants';
import { ArquivoAtualizacaoConverter } from '../dto/converter/arquivo-atualizacao.converter';
import { ArquivoAtualizacaoRequestCreate } from '../dto/request/arquivo-atualizacao.request-create';
import { ArquivoAtualizacaoResponse } from '../dto/response/arquivo-atualizacao.response';

// Sem remove.ts: 06_grants.sql [06-G] só concede INSERT/UPDATE em arquivo_atualizacao, e não há policy de
// DELETE em 04. Sem update.ts: a tabela só tem as 2 FKs (id_arquivo, id_atualizacao), sem campo que faça
// sentido editar depois de criado; para trocar o vínculo, a via seria excluir e recriar (o que não é possível
// sem DELETE granted).
@Injectable()
export class ArquivoAtualizacaoServiceCreate {
  constructor(private readonly database: DatabaseService) {}

  async executar(
    dto: ArquivoAtualizacaoRequestCreate,
  ): Promise<ArquivoAtualizacaoResponse> {
    const linha = await this.database
      .getDb()
      .insertInto('arquivo_atualizacao')
      .values({
        id_arquivo: dto.idArquivo,
        id_atualizacao: dto.idAtualizacao,
      })
      .returning(ARQUIVO_ATUALIZACAO_COLUNAS_SELECT)
      .executeTakeFirstOrThrow();

    return ArquivoAtualizacaoConverter.paraResponseDto(linha);
  }
}
