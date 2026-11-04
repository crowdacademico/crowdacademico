import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { ATUALIZACAO_CAMPANHA_COLUNAS_SELECT } from '../constants/atualizacao-campanha.constants';
import { AtualizacaoCampanhaConverter } from '../dto/converter/atualizacao-campanha.converter';
import { AtualizacaoCampanhaRequestCreate } from '../dto/request/atualizacao-campanha.request-create';
import { AtualizacaoCampanhaResponse } from '../dto/response/atualizacao-campanha.response';
import { AnexoAtualizacaoService } from './anexo-atualizacao.service';

@Injectable()
export class AtualizacaoCampanhaServiceCreate {
  constructor(
    private readonly database: DatabaseService,
    private readonly anexos: AnexoAtualizacaoService,
  ) {}

  async executar(
    dto: AtualizacaoCampanhaRequestCreate,
  ): Promise<AtualizacaoCampanhaResponse> {
    const db = this.database.getDb();
    const linha = await db
      .insertInto('atualizacao_campanha')
      .values({
        id_campanha: dto.idCampanha,
        titulo: dto.titulo,
        conteudo: dto.conteudo,
        fase: dto.fase,
        tipo: dto.tipo,
      })
      .returning(ATUALIZACAO_CAMPANHA_COLUNAS_SELECT)
      .executeTakeFirstOrThrow();

    const idsArquivos = dto.idsArquivos ?? [];
    if (idsArquivos.length > 0) {
      await db
        .insertInto('arquivo_atualizacao')
        .values(
          idsArquivos.map((idArquivo) => ({
            id_arquivo: idArquivo,
            id_atualizacao: linha.id_atualizacao,
          })),
        )
        .execute();
    }
    const links = dto.links ?? [];
    if (links.length > 0) {
      await db
        .insertInto('link_atualizacao')
        .values(
          links.map((link, ordem) => ({
            id_atualizacao: linha.id_atualizacao,
            id_tipolink: link.idTipoLink,
            url: link.url,
            ordem,
          })),
        )
        .execute();
    }

    const anexos = await this.anexos.porAtualizacao([linha.id_atualizacao]);
    return AtualizacaoCampanhaConverter.paraResponseDto(
      linha,
      anexos.get(linha.id_atualizacao),
    );
  }
}
