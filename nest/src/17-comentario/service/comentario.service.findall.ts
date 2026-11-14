import { Inject, Injectable } from '@nestjs/common';
import { ARMAZENAMENTO_SERVICE } from '../../commons/storage/storage.constants';
import type { ArmazenamentoService } from '../../commons/storage/storage.service.interface';
import { sql } from 'kysely';
import { DatabaseService } from '../../commons/database/database.service';
import {
  ResultadoPaginado,
  paginar,
} from '../../commons/database/paginacao.util';
import type { PaginacaoQueryDto } from '../../commons/database/dto/paginacao.query.dto';
import { COMENTARIO_COLUNAS_SELECT } from '../constants/comentario.constants';
import { ComentarioConverter } from '../dto/converter/comentario.converter';
import { ComentarioRequestList } from '../dto/request/comentario.request-list';
import { ComentarioMeuResponse } from '../dto/response/comentario-meu.response';
import { ComentarioResponse } from '../dto/response/comentario.response';

// pol_comentario_select (04) já esconde comentário inativo/não-endossado
// de quem não é dono/moderador. Além disso, o comentário bloqueado pelo dono
// (inativo) some da lista dele; continua visível ao autor e à moderação.
// O nome do autor vem por LEFT JOIN (RF-097), como em campanha.util.with-names.ts:
// conta excluída deixa o comentário sem nome, não o esconde.
@Injectable()
export class ComentarioServiceFindAll {
  constructor(
    private readonly database: DatabaseService,
    @Inject(ARMAZENAMENTO_SERVICE)
    private readonly armazenamento: ArmazenamentoService,
  ) {}

  async listarMinhas(
    paginacao: PaginacaoQueryDto,
  ): Promise<ResultadoPaginado<ComentarioMeuResponse>> {
    const query = this.database
      .getDb()
      .selectFrom('comentario')
      .innerJoin('campanha', 'campanha.id_campanha', 'comentario.id_campanha')
      .select(
        COMENTARIO_COLUNAS_SELECT.map(
          (coluna) => `comentario.${coluna}` as const,
        ),
      )
      .select('campanha.titulo as titulo_campanha')
      .where(
        sql<boolean>`comentario.id_pesquisador = public.id_usuario_atual()`,
      )
      .orderBy('comentario.criado_em', 'desc');
    const resultado = await paginar(query, paginacao);
    return {
      ...resultado,
      dados: resultado.dados.map((linha) => ({
        idComentario: linha.id_comentario,
        idCampanha: linha.id_campanha,
        tituloCampanha: linha.titulo_campanha,
        idPesquisador: linha.id_pesquisador,
        conteudo: linha.conteudo,
        endossado: linha.endossado,
        criadoEm: linha.criado_em,
        ordemEndosso: linha.ordem_endosso,
        ativo: linha.ativo,
      })),
    };
  }

  async executar(
    filtro: ComentarioRequestList,
  ): Promise<ResultadoPaginado<ComentarioResponse>> {
    let query = this.database
      .getDb()
      .selectFrom('comentario')
      .leftJoin('usuario', 'usuario.id_usuario', 'comentario.id_pesquisador')
      .select(
        COMENTARIO_COLUNAS_SELECT.map(
          (coluna) => `comentario.${coluna}` as const,
        ),
      )
      .leftJoin('arquivo as foto', (join) =>
        join
          .onRef('foto.id_arquivo', '=', 'usuario.id_imagem_perfil')
          .on('foto.ativo', '=', true),
      )
      .select(['usuario.nome as nome_pesquisador', 'foto.chave as foto_chave'])
      .where('comentario.id_campanha', '=', filtro.idCampanha)
      .where(
        sql<boolean>`(comentario.ativo OR comentario.id_pesquisador = public.id_usuario_atual() OR public.tem_permissao('comentario_moderar'))`,
      )
      .orderBy('comentario.criado_em', 'desc');
    if (filtro.endossado !== undefined) {
      query = query
        .where('comentario.endossado', '=', filtro.endossado)
        .clearOrderBy()
        .orderBy(
          filtro.endossado
            ? 'comentario.ordem_endosso'
            : 'comentario.criado_em',
          filtro.endossado ? 'asc' : 'desc',
        );
    }

    const resultado = await paginar(query, {
      pagina: filtro.pagina,
      tamanho: filtro.tamanho,
    });

    return {
      ...resultado,
      dados: resultado.dados.map((linha) =>
        ComentarioConverter.paraResponseDto(
          linha,
          linha.foto_chave
            ? this.armazenamento.montarUrlPublica(linha.foto_chave)
            : null,
        ),
      ),
    };
  }
}
