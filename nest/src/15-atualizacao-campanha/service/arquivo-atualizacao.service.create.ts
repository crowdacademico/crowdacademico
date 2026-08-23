import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { ARQUIVO_ATUALIZACAO_COLUNAS_SELECT } from '../constants/arquivo-atualizacao.constants';
import { ArquivoAtualizacaoConverter } from '../dto/converter/arquivo-atualizacao.converter';
import { ArquivoAtualizacaoRequestCreate } from '../dto/request/arquivo-atualizacao.request-create';
import { ArquivoAtualizacaoResponse } from '../dto/response/arquivo-atualizacao.response';

// Sem remove.ts: 06_grants.sql [06-G] só concede INSERT/UPDATE em
// arquivo_atualizacao, nenhuma policy de DELETE em 04. Sem update.ts: a
// tabela só tem as 2 FKs (id_arquivo, id_atualizacao) — não existe campo
// (tipo "ordem" de arquivo_recompensa) que faça sentido editar depois de
// criado; pra trocar o vínculo, a via é excluir e recriar (mas nem isso é
// possível hoje sem DELETE granted — combinar com a Alexia se isso vai
// precisar mudar quando o módulo 25-arquivo entrar em uso de verdade).
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
